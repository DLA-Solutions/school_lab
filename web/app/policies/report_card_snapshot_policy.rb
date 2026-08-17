# frozen_string_literal: true

class ReportCardSnapshotPolicy < ApplicationPolicy
  def show?
    publication = record.report_card_publication
    return false unless publication
    return false unless record.report_card_publication_id == publication.id

    if staff_with?(:manage_academic) && record.school_id == school_id
      return true
    end

    guardian_can_read?(publication)
  end

  def guardian_can_read?(publication)
    return false unless guardian_member? && record.school_id == school_id
    return false unless record.guardian_visible?

    Current.guardian.students.kept.exists?(id: publication.student_id)
  end

  def pdf?
    show?
  end

  def update?
    false
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.where(school_id: Current.school.id).released

      if staff_with?(:manage_academic)
        base
      elsif Current.membership&.role == "guardian" && Current.guardian
        base.joins(:report_card_publication)
            .where(report_card_publications: { student_id: Current.guardian.students.kept.select(:id) })
      else
        scope.none
      end
    end
  end
end
