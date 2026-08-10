# frozen_string_literal: true

FactoryBot.define do
  factory :provisioning_import do
    school
    uploaded_by factory: :user
    status { "previewed" }
    row_count { 1 }
    error_report { nil }
    committed_at { nil }

    trait :committed do
      status { "committed" }
      committed_at { Time.current }
    end

    trait :failed do
      status { "failed" }
      error_report { { "rows" => [ { "row" => 2, "errors" => { "student_name" => [ "can't be blank" ] } } ] } }
    end
  end
end
