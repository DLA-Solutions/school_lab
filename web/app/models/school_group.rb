# frozen_string_literal: true

class SchoolGroup < ApplicationRecord
  include Discard::Model

  has_many :schools, dependent: :restrict_with_error
end
