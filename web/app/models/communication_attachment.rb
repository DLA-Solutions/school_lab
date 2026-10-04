# frozen_string_literal: true

# A file a participant uploaded, held until the next message or routine claims it. Bytes,
# content type, and size live on the Active Storage blob. The two owner foreign keys may both
# be null while the client still holds this id, and they must not both be set.
class CommunicationAttachment < ApplicationRecord
  ALLOWED_CONTENT_TYPES = %w[
    image/jpeg
    image/png
    image/webp
    audio/webm
    audio/mp4
    audio/mpeg
    audio/ogg
    video/mp4
    video/webm
  ].freeze

  MAX_BYTE_SIZE = 10.megabytes
  MAX_PER_OWNER = 5

  belongs_to :school
  belongs_to :uploaded_by_membership, class_name: "Membership"
  belongs_to :message, optional: true
  belongs_to :daily_routine, optional: true

  has_one_attached :file

  validate :single_owner
  validate :file_is_allowed
  validate :uploader_belongs_to_school

  def content_type
    file.blob&.content_type
  end

  def byte_size
    file.blob&.byte_size
  end

  private

  def single_owner
    return unless message_id.present? && daily_routine_id.present?

    errors.add(:base, :invalid)
  end

  def file_is_allowed
    return errors.add(:file, :blank) unless file.attached?

    blob = file.blob
    errors.add(:file, :invalid) unless ALLOWED_CONTENT_TYPES.include?(blob.content_type)
    errors.add(:file, :too_large) if blob.byte_size > MAX_BYTE_SIZE
  end

  def uploader_belongs_to_school
    return if uploaded_by_membership.blank? || school_id.blank?
    return if uploaded_by_membership.school_id == school_id

    errors.add(:uploaded_by_membership, :invalid)
  end
end
