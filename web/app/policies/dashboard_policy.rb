# frozen_string_literal: true

# The front page reports the school's head count and its money. A family sees its own boletos
# elsewhere; none of this is theirs to read.
class DashboardPolicy < ApplicationPolicy
  def show?
    billing_metrics? || people_metrics?
  end

  def billing_metrics?
    staff_with?(:view_billing_summary) || staff_with?(:manage_billing)
  end

  def people_metrics?
    staff_with?(:manage_people)
  end
end
