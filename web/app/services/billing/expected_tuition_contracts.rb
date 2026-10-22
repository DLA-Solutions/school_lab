# frozen_string_literal: true

module Billing
  # Which contract stands for a child when the school asks "what do they bring in per month?".
  # The one place that decides it, so the dashboard's average ticket and the expected-payments
  # report cannot drift apart.
  #
  # Eligible: kept, `status: active` contracts whose signature was not called off
  # (`Contract.expected_tuition`). A contract with a cancelled signature is a draft the school
  # withdrew — usually to reissue it with a corrected figure — so it is not an agreement.
  #
  # One per child, never summed. Two contracts of the same child are the same monthly fee on
  # paper twice (a reissue, a renewal, a duplicate), not two fees; adding them is what made a
  # row look like the whole family's total. The contract that stands is, in order:
  #   1. one whose `starts_on`..`ends_on` window covers the day (an absent bound is open);
  #   2. otherwise, any of them;
  # and between those left, the most recently created (highest id).
  module ExpectedTuitionContracts
    Choice = Data.define(:contract, :candidates) do
      # True when the child had more than one eligible contract, so the figure is a choice and
      # not the only possibility.
      def ambiguous? = candidates > 1
    end

    module_function

    # `{ student_id => Choice }` for the eligible contracts in `contracts`.
    def chosen_by_student(contracts, on: Date.current)
      contracts.expected_tuition.to_a.group_by(&:student_id).transform_values do |list|
        Choice.new(contract: pick(list, on), candidates: list.size)
      end
    end

    def pick(list, on)
      in_window = list.select { |contract| covers?(contract, on) }

      (in_window.presence || list).max_by(&:id)
    end

    def covers?(contract, day)
      (contract.starts_on.nil? || contract.starts_on <= day) &&
        (contract.ends_on.nil? || contract.ends_on >= day)
    end
  end
end
