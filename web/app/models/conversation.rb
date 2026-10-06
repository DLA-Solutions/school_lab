# frozen_string_literal: true

# One family chat per child and destination. Who may see the row is derived from role,
# the guardian link, and the current teaching assignment — nothing is stored as a participant.
class Conversation < ApplicationRecord
  include SchoolAuditable

  AUDIENCES = %w[coordination secretary teacher].freeze

  belongs_to :school
  belongs_to :student
  belongs_to :teacher, optional: true

  has_many :messages, dependent: :restrict_with_exception
  has_many :notifications, dependent: :restrict_with_exception

  validates :audience, presence: true, inclusion: { in: AUDIENCES }
  validates :audience,
            uniqueness: {
              scope: %i[school_id student_id],
              conditions: -> { where(teacher_id: nil) }
            },
            if: -> { teacher_id.nil? }
  validates :teacher_id,
            uniqueness: {
              scope: %i[school_id student_id],
              conditions: -> { where(audience: "teacher") }
            },
            if: -> { audience == "teacher" && teacher_id.present? }
  validate :teacher_matches_audience
  validate :parties_belong_to_the_same_school

  scope :recent_first, -> { order(last_message_at: :desc) }

  def teacher_audience?
    audience == "teacher"
  end

  # Who last spoke. No message means no line — a linked father is not a stand-in.
  def sender_line
    message = last_speaker_message
    return if message.blank?

    message.sender_line
  end

  def last_speaker_message=(message)
    @last_speaker_message = message
  end

  def last_speaker_message
    return @last_speaker_message if instance_variable_defined?(:@last_speaker_message)

    messages.order(sent_at: :desc, id: :desc).first
  end

  # One query for the latest message of each row, so the inbox does not load the whole thread.
  def self.preload_last_speakers(conversations)
    rows = Array(conversations)
    return if rows.empty?

    latest_ids = Message
      .where(conversation_id: rows.map(&:id))
      .select("DISTINCT ON (messages.conversation_id) messages.id")
      .order(Arel.sql("messages.conversation_id, messages.sent_at DESC, messages.id DESC"))

    latest = Message
      .where(id: latest_ids)
      .includes(sender_membership: [ :user, { staff_profile: :role_template } ])
      .to_a

    emails = latest.filter_map { |message| message.sender_membership&.user&.email }.uniq
    teachers = Teacher.kept.where(school_id: rows.map(&:school_id).uniq, email: emails)
    teachers_by_sender = teachers.index_by { |teacher| [ teacher.school_id, teacher.email ] }
    rows_by_id = rows.index_by(&:id)

    latest.each do |message|
      email = message.sender_membership&.user&.email
      message.teacher_on_file = teachers_by_sender[[ message.school_id, email ]]
      parent = rows_by_id[message.conversation_id]
      message.association(:conversation).target = parent if parent
    end

    indexed = latest.index_by(&:conversation_id)
    rows.each do |conversation|
      conversation.last_speaker_message = indexed[conversation.id]
    end
  end

  private

  def teacher_matches_audience
    if audience == "teacher"
      errors.add(:teacher, :blank) if teacher_id.blank?
    elsif teacher_id.present?
      errors.add(:teacher, :present)
    end
  end

  def parties_belong_to_the_same_school
    return if school_id.blank?

    errors.add(:student, :invalid) if student && student.school_id != school_id
    errors.add(:teacher, :invalid) if teacher && teacher.school_id != school_id
  end
end
