# frozen_string_literal: true

FactoryBot.define do
  factory :document_signatory do
    school
    role_label { "Secretaria" }
    name { "Maria Silva" }
    title { "Secretária Escolar" }
    discarded_at { nil }
  end

  factory :report_card_config do
    school
    document_signatory { association :document_signatory, school: school }
    created_by_membership { association :membership, :staff, school: school }
    sequence(:version) { |n| n }
    template_key { ReportCardConfig::DEFAULT_TEMPLATE_KEY }
    display_config { { "hide_discipline_ids" => [] } }
    header_text { "Boletim escolar" }
    footer_text { "Documento sem valor legal" }
  end

  factory :report_card_publish_batch do
    school
    school_class { association :school_class, school: school }
    academic_period { association :academic_period, school: school }
    requested_by_membership { association :membership, :staff, school: school }
    mode { "immediate" }
    status { "processing" }
    requested_count { 1 }
    released_count { 0 }
    failed_count { 0 }
    blockers { [] }
  end

  factory :report_card_publish_schedule do
    school
    report_card_publish_batch { association :report_card_publish_batch, school: school }
    scheduled_for { 1.day.from_now }
    school_timezone { School::DEFAULT_TIMEZONE }
    status { "scheduled" }
  end

  factory :report_card_publication do
    school
    student { association :student, school: school }
    academic_period { association :academic_period, school: school }
    created_by_membership { association :membership, :staff, school: school }
  end

  factory :report_card_snapshot do
    school
    report_card_publication { association :report_card_publication, school: school }
    report_card_config { association :report_card_config, school: school }
    sequence(:version) { |n| n }
    grade_launch_digest { Digest::SHA256.hexdigest("digest") }
    snapshot { { "disciplines" => [], "attendance" => {} } }
    released_at { Time.current }
    pdf_storage_key { "report_cards/test/#{SecureRandom.uuid}.pdf" }

    after(:build) do |snapshot|
      next if snapshot.pdf_storage_key.blank?

      ActiveStorage::Blob.create_and_upload!(
        io: StringIO.new("%PDF-1.4 test"),
        filename: "report-card.pdf",
        content_type: "application/pdf",
        key: snapshot.pdf_storage_key
      )
    end
  end
end
