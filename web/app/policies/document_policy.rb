# frozen_string_literal: true

class DocumentPolicy < ApplicationPolicy
  def index?
    school_staff? || guardian_member?
  end

  def show?
    return school_staff? && record.school_id == school_id if school_staff?

    guardian_can_read?
  end

  def create?
    school_staff?
  end

  def update?
    school_staff? && record.school_id == school_id
  end

  def destroy?
    update?
  end

  def approve?
    update?
  end

  def reject?
    update?
  end

  private

  def guardian_can_read?
    return false unless guardian_member? && record.school_id == school_id
    return false unless Document::GUARDIAN_VISIBLE_STATUSES.include?(record.status)

    linked_student_document? || own_guardian_document?
  end

  def linked_student_document?
    record.documentable_type == "Student" &&
      Current.guardian.students.kept.exists?(id: record.documentable_id)
  end

  def own_guardian_document?
    record.documentable_type == "Guardian" &&
      record.documentable_id == Current.guardian.id
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.kept.where(school_id: Current.school.id)

      if Current.membership&.role == "school" && Current.membership&.active?
        base
      elsif Current.membership&.role == "guardian" && Current.guardian
        student_ids = Current.guardian.students.kept.select(:id)
        base.where(status: Document::GUARDIAN_VISIBLE_STATUSES)
            .where(
              "(documents.documentable_type = ? AND documents.documentable_id IN (?)) OR " \
              "(documents.documentable_type = ? AND documents.documentable_id = ?)",
              "Student", student_ids,
              "Guardian", Current.guardian.id
            )
      else
        scope.none
      end
    end
  end
end
