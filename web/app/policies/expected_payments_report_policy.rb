# frozen_string_literal: true

# The expected-payments report names each child, their parents and what the family is contracted
# to pay. That is contract data, so it takes the permission that guards contracts
# (`manage_billing`), not the one that only unlocks the dashboard's aggregates
# (`view_billing_summary`): reading a total is not reading every family's figure.
#
# A guardian never passes — `staff_with?` is false for anyone off the school side.
class ExpectedPaymentsReportPolicy < ApplicationPolicy
  def show?
    staff_with?(:manage_billing)
  end
end
