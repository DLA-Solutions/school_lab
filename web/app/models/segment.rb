# frozen_string_literal: true

class Segment < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :school

  validates :name, presence: true
  validates :name, uniqueness: { scope: :school_id, conditions: -> { kept } }
end
