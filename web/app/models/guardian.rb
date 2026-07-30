# frozen_string_literal: true

class Guardian < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :school
  belongs_to :user, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :student_guardians, dependent: :destroy
  has_many :students, through: :student_guardians
  has_many :charges, dependent: :destroy
  has_many :documents, as: :documentable, dependent: :destroy

  validates :name, presence: true
end
