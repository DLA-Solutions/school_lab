# frozen_string_literal: true

module ReportCards
  # Builds immutable snapshot payload from launched grades and attendance summary (BR-RC09).
  class MaterializeSnapshotService < ApplicationService
    def initialize(student:, school_class:, academic_period:, config:)
      @student = student
      @school_class = school_class
      @academic_period = academic_period
      @config = config
    end

    def call
      attendance_result = Attendance::PeriodSummaryService.call(
        student: student,
        academic_period: academic_period,
        school_class: school_class
      )
      return attendance_result if attendance_result.failure?

      payload = {
        student: student_payload,
        period: period_payload,
        school_class: class_payload,
        config: config_payload,
        disciplines: discipline_rows,
        attendance: attendance_payload(attendance_result.data),
        grade_launch_digest: combined_grade_launch_digest
      }

      ResponseService.success(data: payload)
    end

    private

    attr_reader :student, :school_class, :academic_period, :config

    def student_payload
      {
        id: student.id,
        name: student.name
      }
    end

    def period_payload
      {
        id: academic_period.id,
        name: academic_period.name,
        sequence: academic_period.sequence,
        closure_status: academic_period.closure_status
      }
    end

    def class_payload
      {
        id: school_class.id,
        name: school_class.full_name
      }
    end

    def config_payload
      {
        id: config.id,
        version: config.version,
        template_key: config.template_key,
        display_config: config.display_config,
        header_text: config.header_text,
        footer_text: config.footer_text,
        signatory: config.signatory_snapshot
      }
    end

    def discipline_rows
      visible_disciplines.map { |discipline| discipline_row(discipline) }
    end

    def visible_disciplines
      hidden_ids = Array(config.display_config["hide_discipline_ids"]).map(&:to_i)
      ClassDiscipline.kept
                     .where(school_id: student.school_id, school_class: school_class)
                     .includes(:subject)
                     .order(:id)
                     .reject { |discipline| hidden_ids.include?(discipline.id) }
    end

    def discipline_row(discipline)
      launch = GradeLaunch.current.find_by!(
        school_id: student.school_id,
        class_discipline: discipline,
        academic_period: academic_period
      )
      template = EvaluationTemplate.current.find_by!(
        school_id: student.school_id,
        school_class: school_class,
        academic_period: academic_period
      )
      components = template.evaluation_components.kept.order(:position)
      entries = GradeEntry.kept.where(
        student: student,
        class_discipline: discipline,
        academic_period: academic_period
      )
      override = GradeOverride.current.find_by(
        student: student,
        class_discipline: discipline,
        academic_period: academic_period
      )

      {
        class_discipline_id: discipline.id,
        subject_id: discipline.subject_id,
        subject_name: discipline.subject.name,
        grade_launch_id: launch.id,
        grade_launch_digest: launch.input_digest,
        components: components.map { |component| component_payload(component, entries) },
        override: override_payload(override),
        final_value: override&.override_value || computed_final(components, entries)
      }
    end

    def component_payload(component, entries)
      entry = entries.find { |row| row.evaluation_component_id == component.id }
      {
        id: component.id,
        name: component.name,
        weight_percent: component.weight_percent.to_s("F"),
        entry_kind: component.entry_kind,
        value: entry&.value
      }
    end

    def override_payload(override)
      return nil if override.blank?

      {
        computed_value: override.computed_value,
        override_value: override.override_value,
        reason_code: override.reason_code
      }
    end

    def computed_final(components, entries)
      return nil if components.empty?

      # `sum`'s implicit initial value is the Integer 0; when every component is still blank (a
      # grade_launch existing does not guarantee every component has a value yet) the block never
      # returns a BigDecimal and `total` stays an Integer, which `Integer#round` cannot take a
      # rounding-mode argument for. Seeding with BigDecimal(0) keeps `total` a BigDecimal
      # regardless of how many entries are blank.
      total = components.sum(BigDecimal(0)) do |component|
        entry = entries.find { |row| row.evaluation_component_id == component.id }
        next BigDecimal(0) if entry.blank? || entry.value.blank?

        entry.value.to_d * (component.weight_percent / 100)
      end
      total.round(2, BigDecimal::ROUND_HALF_UP).to_s("F")
    end

    def attendance_payload(summary)
      {
        instructional_sessions: summary.instructional_sessions,
        present_count: summary.present_count,
        absent_count: summary.absent_count,
        late_count: summary.late_count,
        excused_count: summary.excused_count,
        numerator: summary.numerator,
        late_counts_as_absence: summary.late_counts_as_absence,
        percentage: summary.percentage
      }
    end

    def combined_grade_launch_digest
      digests = visible_disciplines.map do |discipline|
        GradeLaunch.current.find_by(
          school_id: student.school_id,
          class_discipline: discipline,
          academic_period: academic_period
        )&.input_digest
      end.compact

      Digest::SHA256.hexdigest(digests.sort.join("|"))
    end
  end
end
