# frozen_string_literal: true

# A file is uploaded before a message or a routine claims it, so creating one only checks that
# the caller may take part in this school: an active teacher-role membership, or a guardian.
# Until something claims the file, only the uploader can read it. Once it sits on a message,
# the thread's participants can. Once it sits on a routine, whoever may read that card can.
# `manage_academic` does not open a message's file; it can read a routine's file only because
# it can read the routine.
class CommunicationAttachmentPolicy < ApplicationPolicy
  def create?
    return false unless teacher_role_member? || guardian_member?
    return true unless record.is_a?(CommunicationAttachment)
    return true if record.school_id.blank?

    record.school_id == school_id
  end

  def show?
    return false unless record.is_a?(CommunicationAttachment)
    return false unless record.school_id == school_id

    if record.message.present?
      conversation = record.message.conversation
      return false if conversation.blank?

      ConversationPolicy.new(user, conversation).show?
    elsif record.daily_routine.present?
      DailyRoutinePolicy.new(user, record.daily_routine).show?
    else
      record.uploaded_by_membership_id.present? &&
        record.uploaded_by_membership_id == Current.membership&.id
    end
  end

  def download?
    show?
  end

  def update?
    false
  end

  def destroy?
    false
  end

  private

  def teacher_role_member?
    membership = Current.membership
    membership&.role == "teacher" && membership.active?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school && Current.membership

      # One query: the uploader's still-unattached files, files on a visible message, and
      # files on a visible routine. Deciding that in Ruby would load every file in the school.
      base = scope.where(school_id: Current.school.id)
      unattached = base.where(
        message_id: nil,
        daily_routine_id: nil,
        uploaded_by_membership_id: Current.membership.id
      )
      on_messages = base.where(message_id: visible_message_ids)
      on_routines = base.where(daily_routine_id: visible_routine_ids)

      unattached.or(on_messages).or(on_routines)
    end

    private

    def visible_message_ids
      MessagePolicy::Scope.new(user, Message.all).resolve.select(:id)
    end

    def visible_routine_ids
      DailyRoutinePolicy::Scope.new(user, DailyRoutine.all).resolve.select(:id)
    end
  end
end
