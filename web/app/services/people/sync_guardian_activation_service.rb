# frozen_string_literal: true

module People
  # Keeps a guardian's activation in step with their children's.
  #
  # A guardian is on the school's books because a child of theirs studies here. Once every child
  # linked to them has left — removed from the roll or transferred out — the guardian has no
  # standing reason to remain active, and is deactivated with them. If a child comes back, so
  # does the guardian.
  #
  # Deliberately not a model callback: it has to run for a deliberate change to a student, not
  # every time a factory or a console session touches one.
  class SyncGuardianActivationService < ApplicationService
    def initialize(student:, actor: nil)
      @student = student
      @actor = actor
    end

    def call
      changed = guardians_of(student).filter_map { |guardian| sync(guardian) }

      ResponseService.success(data: changed)
    end

    private

    attr_reader :student, :actor

    def guardians_of(record)
      record.student_guardians.kept.includes(:guardian).map(&:guardian).compact
    end

    def sync(guardian)
      linked = guardian.student_guardians.kept.includes(:student).map(&:student).compact

      # A guardian with no child linked was never brought in through one — a record being set up,
      # or one whose links were corrected. Nothing here should decide their fate.
      return if linked.empty?

      if linked.none?(&:enrolled?)
        deactivate(guardian)
      else
        reactivate(guardian)
      end
    end

    def deactivate(guardian)
      return if guardian.discarded?

      guardian.discarded_by = actor
      guardian.discarded_at = Time.current
      write(guardian)

      log("guardian.deactivated_with_students", guardian)
      guardian
    end

    def reactivate(guardian)
      return unless guardian.discarded?

      guardian.discarded_by = nil
      guardian.discarded_at = nil
      write(guardian)

      log("guardian.reactivated_with_student", guardian)
      guardian
    end

    # Saved without validation on purpose: this is a consequence of a change to a student, and a
    # guardian record that predates a later rule must not be able to block that change. The audit
    # trail still records it, since this is a real save.
    def write(guardian)
      guardian.save(validate: false)
    end

    def log(event, guardian)
      Rails.logger.info(
        {
          event: event,
          guardian_id: guardian.id,
          school_id: guardian.school_id,
          triggered_by_student_id: student.id
        }.to_json
      )
    end
  end
end
