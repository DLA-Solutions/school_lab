# frozen_string_literal: true

class BillingSummaryPolicy < ApplicationPolicy
  def show?
    staff_with?(:view_billing_summary)
  end
end
