# frozen_string_literal: true

module Grades
  # Deterministic digest of all contributing inputs for a class-discipline-period launch.
  class ComputeInputDigestService < ApplicationService
    def initialize(class_discipline:, academic_period:)
      @class_discipline = class_discipline
      @academic_period = academic_period
    end

    def call
      ResponseService.success(data: { digest: Digest::SHA256.hexdigest(canonical_payload) })
    end

    private

    attr_reader :class_discipline, :academic_period

    def canonical_payload
      template = current_template
      components = template&.evaluation_components&.kept&.order(:id)&.map { |component| component_payload(component) } || []
      entries = GradeEntry.kept
                            .where(class_discipline: class_discipline, academic_period: academic_period)
                            .order(:id)
                            .map { |entry| entry_payload(entry) }
      overrides = GradeOverride.current
                               .where(class_discipline: class_discipline, academic_period: academic_period)
                               .order(:id)
                               .map { |override| override_payload(override) }

      JSON.generate(
        template: template_payload(template),
        components: components,
        entries: entries,
        overrides: overrides
      )
    end

    def current_template
      EvaluationTemplate.current.find_by(
        school_id: class_discipline.school_id,
        school_class_id: class_discipline.school_class_id,
        academic_period: academic_period
      )
    end

    def template_payload(template)
      return nil if template.blank?

      {
        id: template.id,
        version: template.version,
        rounding_mode: template.rounding_mode,
        lock_on_launch: template.lock_on_launch
      }
    end

    def component_payload(component)
      {
        id: component.id,
        name: component.name,
        weight_percent: component.weight_percent.to_s("F"),
        entry_kind: component.entry_kind,
        grade_scale_id: component.grade_scale_id
      }
    end

    def entry_payload(entry)
      {
        id: entry.id,
        student_id: entry.student_id,
        component_id: entry.evaluation_component_id,
        value: entry.value,
        entry_kind: entry.entry_kind
      }
    end

    def override_payload(override)
      {
        id: override.id,
        student_id: override.student_id,
        computed_value: override.computed_value,
        override_value: override.override_value,
        reason_code: override.reason_code
      }
    end
  end
end
