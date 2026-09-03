# frozen_string_literal: true

# One entry in a user's bell — school-scoped, but read by the user across whichever school they
# are looking at, the same way `Current.user` is not re-derived per school.
class Notification < ApplicationRecord
  belongs_to :user
  belongs_to :school
  belongs_to :contract, optional: true

  validates :kind, :title, presence: true

  scope :unread, -> { where(read_at: nil) }
  scope :recent_first, -> { order(created_at: :desc) }

  def read?
    read_at.present?
  end

  def mark_read!
    update!(read_at: Time.current) unless read?
  end
end
