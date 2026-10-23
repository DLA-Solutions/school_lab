# frozen_string_literal: true

# A school-level regulatory file (BC5 "Compliance"). Staff-only surface, so it carries the sender
# but nothing about review: these rows are `approved` on upload.
class ComplianceDocumentBlueprint < Blueprinter::Base
  identifier :id

  fields :document_type, :status, :uploaded_by_id, :created_at, :updated_at

  field :document_type_label do |document|
    label_for(document.document_type)
  end

  field :filename do |document|
    document.file.filename.to_s if document.file.attached?
  end

  field :content_type do |document|
    document.file.content_type if document.file.attached?
  end

  field :byte_size do |document|
    document.file.byte_size if document.file.attached?
  end

  field :file_url do |document, options|
    next unless document.file.attached?

    helpers = options[:url_helpers] || Rails.application.routes.url_helpers
    helpers.rails_blob_url(document.file, only_path: !options[:full_url])
  end

  def self.label_for(key)
    I18n.t("documents.compliance_types.#{key}", default: key.to_s.humanize)
  end

  # The closed catalog in display order, so the SPA can show a type that has no file yet.
  def self.catalog
    Document::COMPLIANCE_DOCUMENT_TYPES.map { |key| { key: key, label: label_for(key) } }
  end
end
