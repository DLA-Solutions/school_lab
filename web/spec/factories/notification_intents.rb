# frozen_string_literal: true

FactoryBot.define do
  factory :notification_intent do
    school
    channel_key { "report_cards" }
    source_type { "ReportCardSnapshot" }
    sequence(:source_id)
    payload do
      { "title" => "Boletim disponível", "body" => "O boletim do seu filho já está disponível." }
    end
  end
end
