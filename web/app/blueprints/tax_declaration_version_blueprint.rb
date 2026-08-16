# frozen_string_literal: true

class TaxDeclarationVersionBlueprint < Blueprinter::Base
  field :id
  field :number do |version|
    version.version
  end

  field :lifecycle do |version|
    version.lifecycle
  end

  field :supersedes_version_id do |version|
    version.supersedes_id
  end

  fields :total_declared_principal_amount_cents

  field :issued_at do |version|
    version.issued_at&.iso8601
  end

  field :students do |version|
    Array(version.calculation_snapshot["students"]).map do |row|
      {
        student_id: row["student_id"],
        student_name: row["student_name"],
        declared_principal_amount_cents: row["declared_principal_amount_cents"]
      }
    end
  end

  field :pdf_url do |version, options|
    school_id = options.fetch(:school_id)
    declaration_id = version.tax_declaration_id
    "/api/v1/schools/#{school_id}/me/tax_declarations/#{declaration_id}/versions/#{version.id}/pdf"
  end
end
