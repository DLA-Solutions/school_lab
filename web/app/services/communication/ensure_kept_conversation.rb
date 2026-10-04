# frozen_string_literal: true

module Communication
  # One kept thread per child. Callers must already be inside a transaction: the row is locked
  # until that transaction ends so two sends cannot both miss the idempotency check.
  # A lost insert on the partial unique index is re-read; the uniqueness validation can also
  # lose that race once the other insert has committed.
  class EnsureKeptConversation
    def self.call(school:, student:)
      new(school:, student:).call
    end

    def initialize(school:, student:)
      @school = school
      @student = student
    end

    def call
      conversation = Conversation.kept.find_by(school_id: school.id, student_id: student.id)
      conversation ||= insert_conversation
      conversation.lock!
      conversation
    end

    private

    attr_reader :school, :student

    def insert_conversation
      Conversation.transaction(requires_new: true) do
        Conversation.create!(school: school, student: student)
      end
    rescue ActiveRecord::RecordNotUnique
      Conversation.kept.find_by!(school_id: school.id, student_id: student.id)
    rescue ActiveRecord::RecordInvalid
      existing = Conversation.kept.find_by(school_id: school.id, student_id: student.id)
      raise if existing.nil?

      existing
    end
  end
end
