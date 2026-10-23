# frozen_string_literal: true

class DocumentPolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_documents) || guardian_member?
  end

  def show?
    return staff_with?(:manage_documents) && record.school_id == school_id if Current.membership&.staff_member?

    guardian_can_read?
  end

  def create?
    staff_with?(:manage_documents)
  end

  # "Meus documentos": a guardian uploading for a child of the family. Which child is not decided
  # here — the service resolves it through the guardian's own links.
  def create_family_document?
    guardian_member?
  end

  def update?
    staff_with?(:manage_documents) && record.school_id == school_id
  end

  # Class-level gate so a user without `manage_documents` gets `403` before any record lookup
  # (the scope would otherwise answer `404` for them).
  def manage?
    staff_with?(:manage_documents)
  end

  # "Deleting" only inactivates (Discard) — the row and the stored file stay (BR-ARC14).
  def destroy?
    update?
  end

  # Staff may list inactivated documents (`inactive=true`); no guardian ever does.
  def list_inactive?
    staff_with?(:manage_documents)
  end

  # School compliance files (BC5) are staff-only. `index?` cannot be reused: it also admits
  # guardians, who must get a 403 here, not an empty list.
  def manage_compliance?
    return false unless staff_with?(:manage_documents)

    record.is_a?(Class) || record.school_id == school_id
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
    return false if record.discarded?
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
    # Inactive documents are kept for the student's history but only staff with
    # `manage_documents` can list them, and only through this explicit method.
    def resolve_inactive
      return scope.none unless Current.school && staff_with?(:manage_documents)

      scope.discarded.where(school_id: Current.school.id)
    end

    def resolve
      return scope.none unless Current.school

      base = scope.kept.where(school_id: Current.school.id)

      if staff_with?(:manage_documents)
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
