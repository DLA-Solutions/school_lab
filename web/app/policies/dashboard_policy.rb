# frozen_string_literal: true

# The front page reports the school's head count and its money. A family sees its own boletos
# elsewhere; none of this is theirs to read.
class DashboardPolicy < ApplicationPolicy
  def show? = school_staff?
end
