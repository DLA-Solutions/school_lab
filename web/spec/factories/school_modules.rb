# frozen_string_literal: true

FactoryBot.define do
  factory :school_module do
    school
    module_key { "communication" }
    enabled { true }
  end
end
