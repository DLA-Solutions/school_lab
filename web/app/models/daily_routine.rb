# frozen_string_literal: true

# The infantil day, one card per child per civil date. Blank answers are stored as null so a
# guardian payload can omit them. Sent rows are not discarded: a family has already been shown
# the card, and how long that record lives is still open.
class DailyRoutine < ApplicationRecord
  include SchoolAuditable

  TIME_ZONE = "America/Sao_Paulo"

  STATUSES = %w[draft sent].freeze
  YES_NO = %w[yes no].freeze
  MEAL_VALUES = %w[great regular refused].freeze
  MEAL_FIELDS = %w[
    meal_breakfast meal_lunch meal_afternoon_snack meal_dinner meal_hydration
  ].freeze
  YES_NO_FIELDS = %w[
    sleep_morning sleep_after_lunch sleep_afternoon interaction evacuation discomfort
  ].freeze
  CONTENT_FIELDS = (YES_NO_FIELDS + MEAL_FIELDS + %w[narrative discomfort_detail]).freeze

  belongs_to :school
  belongs_to :student
  belongs_to :school_class
  belongs_to :author, class_name: "Teacher"

  has_one :routine_message, class_name: "Message", dependent: :restrict_with_exception
  has_many :communication_attachments, dependent: :restrict_with_exception

  before_validation :nilify_blanks

  validates :date, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :student_id, uniqueness: { scope: %i[school_id date] }
  validates :sleep_morning, :sleep_after_lunch, :sleep_afternoon,
            :interaction, :evacuation, :discomfort,
            inclusion: { in: YES_NO }, allow_nil: true
  validates :meal_breakfast, :meal_lunch, :meal_afternoon_snack, :meal_dinner, :meal_hydration,
            inclusion: { in: MEAL_VALUES }, allow_nil: true
  validate :parties_belong_to_school
  validate :discomfort_detail_matches_signal

  def self.today(zone: TIME_ZONE)
    Time.find_zone(zone).today
  end

  def sent?
    status == "sent"
  end

  def draft?
    status == "draft"
  end

  # A past civil date is locked. Today and a future date can still be written; the service
  # decides. Blank fields do not count as content.
  def content_present?
    narrative.present? ||
      YES_NO_FIELDS.any? { |field| self[field].present? } ||
      MEAL_FIELDS.any? { |field| self[field].present? } ||
      communication_attachments.any?
  end

  private

  def nilify_blanks
    CONTENT_FIELDS.each do |field|
      self[field] = nil if self[field].blank?
    end
  end

  def parties_belong_to_school
    return if school_id.blank?

    errors.add(:student, :invalid) if student.present? && student.school_id != school_id
    errors.add(:school_class, :invalid) if school_class.present? && school_class.school_id != school_id
    errors.add(:author, :invalid) if author.present? && author.school_id != school_id
  end

  # Mal-estar without a note is an unfinished health fact. A note without mal-estar would
  # publish a symptom the teacher did not mark.
  def discomfort_detail_matches_signal
    if discomfort == "yes"
      errors.add(:discomfort_detail, :blank) if discomfort_detail.blank?
    elsif discomfort_detail.present?
      errors.add(:discomfort_detail, :present)
    end
  end
end
