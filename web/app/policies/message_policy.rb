# frozen_string_literal: true

# Sending is allowed for whoever may open the inbox. The service decides whether that actor
# may address the requested audience. Listing messages authorizes the conversation instead.
class MessagePolicy < ApplicationPolicy
  def index?
    false
  end

  def create?
    ConversationPolicy.new(user, Conversation).index?
  end

  def show?
    false
  end

  def update?
    false
  end

  def destroy?
    false
  end
end
