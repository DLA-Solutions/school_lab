# frozen_string_literal: true

FactoryBot.define do
  factory :communication_attachment do
    school
    uploaded_by_membership { association :membership, school: school, role: "teacher" }

    after(:build) do |attachment|
      blob = ActiveStorage::Blob.create_and_upload!(
        io: StringIO.new("jpeg-bytes"),
        filename: "photo.jpg",
        content_type: "image/jpeg",
        identify: false
      )
      attachment.file.attach(blob)
    end
  end
end
