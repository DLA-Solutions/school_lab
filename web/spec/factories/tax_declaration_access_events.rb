# frozen_string_literal: true

FactoryBot.define do
  factory :tax_declaration_access_event do
    school
    tax_declaration { association :tax_declaration, school: school }
    tax_declaration_version { association :tax_declaration_version, school: school, tax_declaration: tax_declaration }
    guardian { tax_declaration.guardian }
    actor_user { guardian.user || association(:user) }
    event_type { "pdf_download" }
    sequence(:request_uuid) { |n| "request-uuid-#{n}" }
    occurred_at { Time.current }
  end
end
