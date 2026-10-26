# frozen_string_literal: true

module Billing
  # Which contracts the school may issue a month's boleto for in one pass: one per child, and only
  # for children who are still enrolled. The listing the school picks from and the service that
  # bills the pick both come through here, so a client that posts ids by hand cannot get past what
  # the screen would have offered.
  #
  # The contract that stands for a child is `Billing::ExpectedTuitionContracts`' choice — the same
  # one the dashboard and the expected-payments report use — so a reissue, a renewal or a
  # duplicate never turns one family into two boletos.
  module BulkBillableContracts
    module_function

    # `contracts` is a tenant-scoped relation (`policy_scope(Contract)` or `school.contracts`).
    # Returns a relation, so callers add their own preloads and ordering.
    def for(contracts)
      enrolled = contracts.joins(:student).merge(Student.enrolled)
      chosen_ids = ExpectedTuitionContracts.chosen_by_student(enrolled).values.map { |choice| choice.contract.id }

      contracts.where(id: chosen_ids)
    end

    # Enrolled students the school cannot bill because no contract stands for them — none active,
    # or only cancelled-signature ones. The listing shows them so the gap is noticed instead of
    # the child silently missing from the month. `billable_contracts` is `for(...)`'s result.
    def students_without_contract(students, billable_contracts)
      students.enrolled.where.not(id: billable_contracts.select(:student_id))
    end
  end
end
