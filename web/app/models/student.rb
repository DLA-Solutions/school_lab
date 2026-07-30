# frozen_string_literal: true

class Student < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  STATUSES = %w[active transferred].freeze

  belongs_to :school
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :student_guardians, dependent: :destroy
  has_many :guardians, through: :student_guardians
  has_many :contracts, dependent: :destroy
  has_many :documents, as: :documentable, dependent: :destroy

  validates :name, presence: true
  validates :status, inclusion: { in: STATUSES }
end
