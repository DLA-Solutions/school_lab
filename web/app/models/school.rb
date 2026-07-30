# frozen_string_literal: true

class School < ApplicationRecord
  include Discard::Model

  belongs_to :school_group, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :memberships, dependent: :destroy

  validates :name, presence: true
end
