# frozen_string_literal: true

FactoryBot.define do
  factory :document do
    school
    documentable { association :student, school: school }
    document_type { "birth_certificate" }
    uploaded_by { association :user }

    after(:build) do |document|
      document.file.attach(
        io: File.open(Rails.root.join("spec/fixtures/files/sample.pdf")),
        filename: "sample.pdf",
        content_type: "application/pdf"
      )
    end

    trait :approved do
      after(:create) do |document|
        document.update!(reviewed_at: Time.current)
        document.approve! if document.may_approve?
      end
    end

    trait :rejected do
      rejection_reason { "Illegible scan" }

      after(:create) do |document|
        document.update!(reviewed_at: Time.current)
        document.reject! if document.may_reject?
      end
    end
  end
end
