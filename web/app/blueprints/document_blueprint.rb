# frozen_string_literal: true

class DocumentBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :document_type, :status, :rejection_reason, :reviewed_at, :created_at, :updated_at

  field :documentable_type
  field :documentable_id

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
end
