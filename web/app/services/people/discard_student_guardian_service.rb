# frozen_string_literal: true

module People
  class DiscardStudentGuardianService < ApplicationService
    def initialize(link:)
      @link = link
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if link.discarded?
      return ResponseService.failure(code: :student_requires_a_guardian) if last_kept_guardian_link?

      link.discard
      ResponseService.success
    end

    private

    attr_reader :link

    # Same invariant `People::UpdateStudentService#would_leave_no_guardian?` enforces on the
    # student edit form: a student with no guardian link left cannot be billed or contacted, and
    # a `Guardian` record surviving elsewhere (a sibling's family, say) does not help this child.
    def last_kept_guardian_link?
      link.student.student_guardians.kept.count <= 1
    end
  end
end
