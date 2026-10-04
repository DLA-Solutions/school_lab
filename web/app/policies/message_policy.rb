# frozen_string_literal: true

# A message is visible exactly when its thread is. There is no separate audience: posting,
# listing, and reading all ask ConversationPolicy whether the caller is still a participant.
# Sent text is not edited and not deleted; a correction is a later message.
class MessagePolicy < ApplicationPolicy
  def index?
    conversation_visible?
  end

  def show?
    conversation_visible?
  end

  def create?
    conversation_visible?
  end

  def update?
    false
  end

  def destroy?
    false
  end

  private

  # A new, unsaved message has no id yet. The conversation it is about to join is the record
  # that decides, including one the send service has built but not inserted.
  def conversation_visible?
    return false unless record.is_a?(Message)

    conversation = record.conversation
    return false if conversation.blank?
    return false if record.school_id.present? && record.school_id != school_id

    ConversationPolicy.new(user, conversation).show?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      visible_conversations = ConversationPolicy::Scope.new(user, Conversation.all).resolve
      scope.where(school_id: Current.school.id, conversation_id: visible_conversations.select(:id))
    end
  end
end
