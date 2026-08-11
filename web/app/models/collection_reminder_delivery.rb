# frozen_string_literal: true

class CollectionReminderDelivery < ApplicationRecord
  belongs_to :school
  belongs_to :charge

  validates :rule_key, presence: true
  validates :sent_on, presence: true
  validates :rule_key, uniqueness: { scope: %i[charge_id sent_on] }
end
