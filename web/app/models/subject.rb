# frozen_string_literal: true

class Subject < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :school
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :teaching_assignments, dependent: :destroy
  has_many :school_classes, -> { distinct }, through: :teaching_assignments

  validates :name, presence: true
  validates :name, uniqueness: { scope: :school_id, conditions: -> { kept } }, if: :kept?
end
