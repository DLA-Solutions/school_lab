# frozen_string_literal: true

FactoryBot.define do
  factory :tax_declaration_version do
    school
    tax_declaration { association :tax_declaration, school: school }
    sequence(:version) { |n| n }
    calculation_digest { SecureRandom.hex(16) }
    total_declared_principal_amount_cents { 100_000 }
    settings_version { 1 }
    school_identity_snapshot do
      {
        legal_name: school.name,
        cnpj: school.cnpj,
        formatted_cnpj: school.formatted_cnpj
      }
    end
    payer_identity_snapshot do
      {
        id: tax_declaration.guardian_id,
        name: tax_declaration.guardian.name,
        cpf: tax_declaration.guardian.cpf
      }
    end
    legal_text_snapshot { "Annual declaration text." }
    legal_text_version_snapshot { "2026-01" }
    document_signatory_snapshot { { id: 1, name: "Director", role_label: "Principal" } }
    purpose_configuration_snapshot { { configuration_digest: "abc" } }
    approval_snapshot { { configuration_version: 1 } }
    calculation_snapshot do
      {
        calendar_year: tax_declaration.calendar_year,
        total_declared_principal_amount_cents: total_declared_principal_amount_cents,
        students: []
      }
    end
    sequence(:verification_code) { |n| "VERIFY#{n}" }
    sequence(:pdf_storage_key) { |n| "tax_declarations/#{school.id}/test-#{n}.pdf" }
    issued_at { Time.current }

    after(:build) do |version|
      blob = ActiveStorage::Blob.create_and_upload!(
        io: StringIO.new("%PDF-1.4 test"),
        filename: "tax-declaration.pdf",
        content_type: "application/pdf",
        key: version.pdf_storage_key
      )
      blob
    end
  end
end
