# frozen_string_literal: true

# Who may see a child's family thread, and who may post on it.
#
# The thread has no stored participant list. A teacher sees it only while their membership role
# is `teacher` and a kept teaching assignment covers the student's current class — the same
# narrowing Incident uses for a teacher, and deliberately not the `teach` permission.
# A guardian sees it only while linked to that student. Someone who leaves stops qualifying;
# the history stays for whoever still does.
#
# `moderate_messages` is not consulted: moderation does not open a private thread.
# `manage_academic` reads the daily routine and does not read this thread, even when the same
# membership also holds that permission — a teacher who coordinates is still narrowed to the
# classes they teach.
class ConversationPolicy < ApplicationPolicy
  def index?
    teacher_role_member? || guardian_member?
  end

  def show?
    kept_in_school? && visible_student?(record.student)
  end

  # The row is created inside the send service on the first post. There is no standalone create.
  def create?
    false
  end

  # A sent message stays. A correction is a later message, so the thread is not edited or removed.
  def update?
    false
  end

  def destroy?
    false
  end

  def post?
    show?
  end

  # A class notice is copied into each enrolled child's thread. Coordination with
  # `manage_academic` and no teacher assignment cannot broadcast one.
  def class_notice?(school_class)
    return false unless teacher_role_member?
    return false if school_id.blank? || school_class.blank?
    return false unless school_class.school_id == school_id

    teaches_class?(school_class)
  end

  # Controllers use this to answer "is this child in the caller's family or classes?" with a
  # 404 when the answer is no, before a thread even exists.
  def visible_student?(student)
    return false if school_id.blank? || student.blank? || student.discarded?
    return false unless student.school_id == school_id

    teacher_of?(student) || linked_guardian?(student)
  end

  private

  def kept_in_school?
    record.is_a?(Conversation) && record.kept? && record.school_id == school_id
  end

  def teacher_of?(student)
    teacher_role_member? && teaches_student?(student)
  end

  def linked_guardian?(student)
    return false unless guardian_member?

    Current.guardian.student_guardians.kept.exists?(student_id: student.id)
  end

  def teacher_role_member?
    membership = Current.membership
    membership&.role == "teacher" && membership.active?
  end

  def current_teacher
    @current_teacher ||= Current.school&.teachers&.kept&.find_by(email: user&.email)
  end

  def teaches_student?(student)
    teaches_class?(student.school_class)
  end

  def teaches_class?(school_class)
    teacher = current_teacher
    return false if teacher.blank? || school_class.blank?

    teacher.teaching_assignments.kept.exists?(school_class_id: school_class.id)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.kept.where(school_id: Current.school.id)

      if teacher_role_member?
        assigned_students(base)
      elsif guardian_member?
        base.where(student_id: linked_student_ids)
      else
        scope.none
      end
    end

    private

    # `manage_academic` is intentionally not a branch. Holding it does not widen a teacher,
    # and a staff membership that only holds it sees no threads.
    def assigned_students(relation)
      teacher = Current.school.teachers.kept.find_by(email: user&.email)
      return relation.none if teacher.blank?

      class_ids = teacher.teaching_assignments.kept.select(:school_class_id)
      student_ids = Student.kept.where(school_id: Current.school.id, school_class_id: class_ids).select(:id)
      relation.where(student_id: student_ids)
    end

    def linked_student_ids
      Student.kept.where(id: Current.guardian.student_guardians.kept.select(:student_id)).select(:id)
    end

    def teacher_role_member?
      membership = Current.membership
      membership&.role == "teacher" && membership.active?
    end

    def guardian_member?
      membership = Current.membership
      membership&.role == "guardian" && membership.active? && Current.guardian.present?
    end
  end
end
