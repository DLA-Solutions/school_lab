# frozen_string_literal: true

module Billing
  # Who may be billed on the two screens that only trust a contract once it is signed: the bulk
  # emission listing and the avulso flow's student picker. Stricter than the shared
  # `Contract.expected_tuition` scope (which still treats a `pending_signature` contract as the
  # one that stands for the dashboard and the expected-payments report) — those stay on
  # `ExpectedTuitionContracts` untouched; this is a second, narrower rule layered on top for the
  # two screens that must not let staff raise a boleto before the family has actually signed.
  #
  # Every student still gets a row — nothing is dropped — tagged with why they are not billable so
  # staff see the gap instead of a child silently missing:
  #   "cancelled"           — has a contract whose signature was called off, and no active+signed
  #                           contract makes up for it.
  #   "pending_signature"   — has an active contract still awaiting signature, and no active+signed
  #                           contract makes up for it.
  # Both can apply together (an old contract was cancelled and its replacement has not been signed
  # yet). Neither applies — and the caller renders its own "no contract at all" indicator — when
  # the student has nothing that explains a gap: no contracts, or only ended/suspended ones.
  module StrictBillableStudents
    Row = Data.define(:student, :contract, :tags) do
      def billable?
        contract.present?
      end

      def without_contract?
        contract.nil? && tags.empty?
      end
    end

    module_function

    # `students` is any enumerable of tenant-scoped Student records, in the order the caller
    # wants rows back. `contracts` is a tenant-scoped relation or array of Contract records
    # belonging to those students (e.g. `policy_scope(Contract).where(student_id: students)`).
    # One row per student, same order as `students`.
    def rows_for(students, contracts, on: Date.current)
      by_student = Array(contracts).group_by(&:student_id)

      students.map { |student| build_row(student, by_student[student.id] || [], on) }
    end

    def build_row(student, student_contracts, on)
      eligible = student_contracts.select { |contract| contract.status == "active" && contract.signed? }
      chosen = eligible.present? ? ExpectedTuitionContracts.pick(eligible, on) : nil

      Row.new(student: student, contract: chosen, tags: tags_for(student_contracts, chosen))
    end

    def tags_for(student_contracts, chosen)
      return [] if chosen.present?

      tags = []
      tags << "cancelled" if student_contracts.any?(&:signature_cancelled?)
      tags << "pending_signature" if student_contracts.any? do |contract|
        contract.status == "active" && contract.signature_status == "pending_signature"
      end
      tags
    end
  end
end
