# frozen_string_literal: true

class ReportCardPublicationPolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_academic) || guardian_member?
  end

  def show?
    staff_can_read? || guardian_can_read?
  end

  def republish?
    staff_with?(:manage_academic) && record.school_id == school_id
  end

  def pdf?
    show?
  end

  private

  def staff_can_read?
    staff_with?(:manage_academic) && record.school_id == school_id
  end

  def guardian_can_read?
    return false unless guardian_member? && record.school_id == school_id

    guardian_linked? && record.active_snapshot&.guardian_visible?
  end

  def guardian_linked?
    Current.guardian.students.kept.exists?(id: record.student_id)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.where(school_id: Current.school.id)

      if staff_with?(:manage_academic)
        base
      elsif Current.membership&.role == "guardian" && Current.guardian
        base.joins(:active_snapshot)
            .merge(ReportCardSnapshot.released)
            .where(student_id: Current.guardian.students.kept.select(:id))
      else
        scope.none
      end
    end
  end
end
