# frozen_string_literal: true

class School < ApplicationRecord
  include Discard::Model

  belongs_to :school_group, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :memberships, dependent: :destroy
  has_many :guardians, dependent: :destroy
  has_many :students, dependent: :destroy
  has_many :student_guardians, dependent: :destroy
  has_many :billing_plans, dependent: :destroy
  has_many :contracts, dependent: :destroy
  has_many :charges, dependent: :destroy
  has_many :payments, dependent: :destroy
  has_many :documents, dependent: :destroy

  validates :name, presence: true
end
