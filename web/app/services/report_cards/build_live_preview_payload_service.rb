# frozen_string_literal: true

module ReportCards
  # Live, read-only payload for the teacher preview PDF (BR-RC14, UC-RC04). Shaped exactly like a
  # persisted ReportCardSnapshot#snapshot payload (string keys, "disciplines" + "attendance") so
  # RenderSnapshotPdfService can render it without caring whether the data came from a snapshot or
  # was computed on demand.
  #
  # Deliberately NOT MaterializeSnapshotService: that service requires a successful grade_launch
  # and a current evaluation_template for every discipline (`find_by!`) because BR-RC05 readiness
  # already guaranteed they exist by the time a snapshot is staged. BR-RC14 explicitly skips that
  # readiness gate, so a discipline with no launch, no template, or no entries yet must render
  # blank instead of raising.
  class BuildLivePreviewPayloadService < ApplicationService
    def initialize(student:, academic_period:)
      @student = student
      @academic_period = academic_period
    end

    def call
      school_class = student.school_class
      return ResponseService.failure(code: :not_found) if school_class.blank?

      attendance_result = Attendance::PeriodSummaryService.call(
        student: student,
        academic_period: academic_period,
        school_class: school_class
      )
      return attendance_result if attendance_result.failure?

      ResponseService.success(
        data: {
          "disciplines" => visible_disciplines(school_class).map { |discipline| discipline_row(discipline) },
          "attendance" => attendance_payload(attendance_result.data)
        }
      )
    end

    private

    attr_reader :student, :academic_period

    def config
      @config ||= ReportCardConfig.current_for(student.school)
    end

    # No config yet means nothing is configured to hide -- a brand-new school still gets a usable
    # preview rather than a blocked one.
    def hidden_discipline_ids
      return [] if config.blank?

      Array(config.display_config["hide_discipline_ids"]).map(&:to_i)
    end

    def visible_disciplines(school_class)
      ClassDiscipline.kept
                     .where(school_id: student.school_id, school_class: school_class)
                     .includes(:subject)
                     .order(:id)
                     .reject { |discipline| hidden_discipline_ids.include?(discipline.id) }
    end

    def discipline_row(discipline)
      components = components_for(discipline)
      entries = GradeEntry.kept.where(
        student: student,
        class_discipline: discipline,
        academic_period: academic_period
      ).to_a
      launch = current_launch_for(discipline)
      override = GradeOverride.current.find_by(
        student: student,
        class_discipline: discipline,
        academic_period: academic_period
      )

      {
        "class_discipline_id" => discipline.id,
        "subject_id" => discipline.subject_id,
        "subject_name" => discipline.subject.name,
        "grade_launch_id" => launch&.id,
        "grade_launch_status" => launch&.status,
        "components" => components.map { |component| component_payload(component, entries) },
        "override" => override_payload(override),
        "final_value" => override&.override_value || computed_final(components, entries)
      }
    end

    def current_template
      @current_template ||= EvaluationTemplate.current.find_by(
        school_id: student.school_id,
        school_class: student.school_class,
        academic_period: academic_period
      )
    end

    # Components are scoped to this discipline explicitly -- a template is shared by the whole
    # class/period, so without this filter a cross-subject preview would mix another discipline's
    # components into this row.
    def components_for(discipline)
      return [] if current_template.blank?

      current_template.evaluation_components.kept.where(class_discipline: discipline).order(:position).to_a
    end

    def current_launch_for(discipline)
      GradeLaunch.current.find_by(
        school_id: student.school_id,
        class_discipline: discipline,
        academic_period: academic_period
      )
    end

    def component_payload(component, entries)
      entry = entries.find { |row| row.evaluation_component_id == component.id }
      {
        "id" => component.id,
        "name" => component.name,
        "weight_percent" => component.weight_percent.to_s("F"),
        "entry_kind" => component.entry_kind,
        "value" => entry&.value
      }
    end

    def override_payload(override)
      return nil if override.blank?

      {
        "computed_value" => override.computed_value,
        "override_value" => override.override_value,
        "reason_code" => override.reason_code
      }
    end

    # No components yet (no template, or none scoped to this discipline) renders blank rather
    # than a misleading zero -- the same "missing launch renders blank" intent as BR-RC14.
    def computed_final(components, entries)
      return nil if components.empty?

      # `sum`'s implicit initial value is the Integer 0; when every component is still blank
      # (BR-RC14's whole point) the block never returns a BigDecimal and `total` stays an
      # Integer, which `Integer#round` can't take a rounding-mode argument for. Seeding with
      # BigDecimal(0) keeps `total` a BigDecimal regardless of how many entries are blank.
      total = components.sum(BigDecimal(0)) do |component|
        entry = entries.find { |row| row.evaluation_component_id == component.id }
        next BigDecimal(0) if entry.blank? || entry.value.blank?

        entry.value.to_d * (component.weight_percent / 100)
      end
      total.round(2, BigDecimal::ROUND_HALF_UP).to_s("F")
    end

    def attendance_payload(summary)
      {
        "instructional_sessions" => summary.instructional_sessions,
        "present_count" => summary.present_count,
        "absent_count" => summary.absent_count,
        "late_count" => summary.late_count,
        "excused_count" => summary.excused_count,
        "numerator" => summary.numerator,
        "late_counts_as_absence" => summary.late_counts_as_absence,
        "percentage" => summary.percentage
      }
    end
  end
end
