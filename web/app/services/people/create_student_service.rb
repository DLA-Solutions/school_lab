# frozen_string_literal: true

module People
  # Creates a student and links them to the guardians identified by CPF in the same transaction:
  # a student saved without the parents the caller asked for would be a half-done enrolment.
  class CreateStudentService < ApplicationService
    PARENT_RELATIONSHIPS = %w[father mother].freeze

    def initialize(school:, params:, guardian_cpfs: {})
      @school = school
      @params = params
      @guardian_cpfs = guardian_cpfs.slice(*PARENT_RELATIONSHIPS.map(&:to_sym)).compact_blank
    end

    def call
      resolved, errors = resolve_guardians
      return ResponseService.failure(code: :validation_error, details: errors) if errors.any?

      student = school.students.build(params)

      ActiveRecord::Base.transaction do
        unless student.save
          return ResponseService.failure(code: :validation_error, details: student.errors.to_hash)
        end

        resolved.each do |relationship, guardian|
          link = student.student_guardians.build(
            school: school, guardian: guardian, relationship: relationship
          )
          next if link.save

          # Roll back rather than leave a student whose parents were only partly attached.
          raise ActiveRecord::Rollback, ResponseService.failure(
            code: :validation_error, details: link.errors.to_hash
          )
        end
      end

      return ResponseService.success(data: student) if student.persisted?

      ResponseService.failure(code: :validation_error, details: student.errors.to_hash)
    end

    private

    attr_reader :school, :params, :guardian_cpfs

    # At least one parent is required: a student with no responsible adult on file cannot be
    # billed or contacted.
    def resolve_guardians
      return [{}, { base: [I18n.t("api.errors.student_requires_a_guardian")] }] if guardian_cpfs.empty?

      resolved = {}
      errors = {}

      guardian_cpfs.each do |relationship, cpf|
        digits = Cpf.normalize(cpf)
        guardian = school.guardians.kept.find_by(cpf: digits) if digits.present?

        if guardian
          resolved[relationship.to_s] = guardian
        else
          # Naming the CPF matters: the fix is to register that guardian first, and the caller
          # needs to know which of the two is missing.
          errors[:"#{relationship}_cpf"] = [
            I18n.t("api.errors.guardian_cpf_not_found", cpf: Cpf.format(cpf))
          ]
        end
      end

      if resolved.values.map(&:id).uniq.size < resolved.size
        errors[:base] = [I18n.t("api.errors.duplicate_guardian_cpf")]
      end

      [resolved, errors]
    end
  end
end
