# frozen_string_literal: true

module People
  # Updates a student and reconciles the parents identified by CPF, in one transaction.
  #
  # The parents are edited on the same form as the rest of the record, so they have to be saved
  # from it too. Without that, a student enrolled with only one parent on file could never gain
  # the other: the form offered the field, the update dropped it, and the second parent was
  # missing from every contract that followed.
  class UpdateStudentService < ApplicationService
    PARENT_RELATIONSHIPS = %w[father mother].freeze

    # `guardian_cpfs` absent means the caller is not editing the parents at all — a status change
    # or a rename leaves the links alone. A key present but blank is an instruction to unlink.
    def initialize(student:, params:, guardian_cpfs: nil, actor: nil)
      @student = student
      @params = params
      @guardian_cpfs = guardian_cpfs
      @actor = actor
    end

    def call
      resolved, errors = resolve_guardians
      return ResponseService.failure(code: :validation_error, details: errors) if errors.any?

      saved = false

      ActiveRecord::Base.transaction do
        unless student.update(params)
          return ResponseService.failure(code: :validation_error, details: student.errors.to_hash)
        end

        link_errors = reconcile_guardians(resolved)
        if link_errors.any?
          # Roll back rather than leave the student renamed but their parents half-attached.
          @failure_details = link_errors
          raise ActiveRecord::Rollback
        end

        saved = true
      end

      return ResponseService.failure(code: :validation_error, details: @failure_details) unless saved

      # `status` can move to `transferred` here, which is the other way a child stops attending —
      # the guardians follow either way, and so does a parent who was just linked or unlinked.
      SyncGuardianActivationService.call(student: student.reload, actor: actor)

      ResponseService.success(data: student)
    end

    private

    attr_reader :student, :params, :guardian_cpfs, :actor

    def editing_guardians?
      guardian_cpfs.present? || guardian_cpfs.is_a?(Hash)
    end

    def requested
      @requested ||= (guardian_cpfs || {}).slice(*PARENT_RELATIONSHIPS.map(&:to_sym))
    end

    # Prefers an active guardian, and falls back to one deactivated when their last child left —
    # the same order `CreateStudentService` uses, so both forms behave alike.
    def find_guardian(digits)
      student.school.guardians.kept.find_by(cpf: digits) ||
        student.school.guardians.discarded.find_by(cpf: digits)
    end

    # Maps each requested relationship to a guardian, or to nil where the field was cleared.
    def resolve_guardians
      return [ {}, {} ] unless editing_guardians?

      resolved = {}
      errors = {}

      requested.each do |relationship, cpf|
        digits = Cpf.normalize(cpf)

        if digits.blank?
          resolved[relationship.to_s] = nil
          next
        end

        guardian = find_guardian(digits)

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

      present = resolved.values.compact
      if present.map(&:id).uniq.size < present.size
        errors[:base] = [ I18n.t("api.errors.duplicate_guardian_cpf") ]
      end

      # A student with no responsible adult on file cannot be billed or contacted, and the parents
      # this form governs are the only links it can see — an "other" guardian attached elsewhere
      # still counts, so the check is against what would be left, not against these two alone.
      if would_leave_no_guardian?(resolved)
        errors[:base] = [ I18n.t("api.errors.student_requires_a_guardian") ]
      end

      [ resolved, errors ]
    end

    def would_leave_no_guardian?(resolved)
      return false if resolved.values.any?(&:present?)

      remaining = current_links.reject { |link| resolved.key?(link.relationship) }

      remaining.empty?
    end

    def current_links
      student.student_guardians.kept.to_a
    end

    # Only the relationships the caller sent are touched. A guardian linked as `other` is left
    # alone: this form has no field for them, so it has no opinion about them either.
    def reconcile_guardians(resolved)
      return {} unless editing_guardians?

      errors = {}

      resolved.each do |relationship, guardian|
        existing = student.student_guardians.kept.find_by(relationship: relationship)

        next if existing&.guardian_id == guardian&.id

        existing&.discard
        next if guardian.nil?

        link = student.student_guardians.build(
          school: student.school, guardian: guardian, relationship: relationship
        )
        errors[:"#{relationship}_cpf"] = link.errors.full_messages unless link.save
      end

      errors
    end
  end
end
