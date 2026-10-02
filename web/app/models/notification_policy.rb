# frozen_string_literal: true

# Per school x channel_key push/email/whatsapp toggles (BR-N02). No persisted row means the
# hardcoded MVP default applies (BR-N03) — a row only exists once staff overrides it via the
# (not yet built) UC-N02 endpoint.
class NotificationPolicy < ApplicationRecord
  belongs_to :school

  # BR-N03: every documented channel_key ships push on, email/whatsapp off.
  DEFAULT_TOGGLES = { push_enabled: true, email_enabled: false, whatsapp_enabled: false }.freeze

  validates :channel_key, presence: true, uniqueness: { scope: :school_id }

  # Effective toggles for a school + channel_key: the persisted override if staff configured one,
  # else an unsaved record carrying the MVP default. Never raises for an unrecognized channel_key
  # — an event still fans out under the default until staff configures it explicitly.
  def self.effective_for(school:, channel_key:)
    find_by(school: school, channel_key: channel_key) ||
      new(school: school, channel_key: channel_key, **DEFAULT_TOGGLES)
  end

  def enabled?(channel)
    case channel.to_s
    when "push" then push_enabled
    when "email" then email_enabled
    when "whatsapp" then whatsapp_enabled
    else false
    end
  end
end
