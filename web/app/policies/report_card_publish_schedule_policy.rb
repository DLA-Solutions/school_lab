# frozen_string_literal: true

class ReportCardPublishSchedulePolicy < ApplicationPolicy
  def show?
    staff_with?(:manage_academic) && record.school_id == school_id
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school && staff_with?(:manage_academic)

      scope.where(school_id: Current.school.id)
    end
  end
end
