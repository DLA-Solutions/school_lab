# frozen_string_literal: true

class StudentHealthRecordBlueprint < Blueprinter::Base
  identifier :id

  fields :student_id, :title, :content, :content_updated_at, :created_at, :updated_at

  field :student_name do |record|
    record.student&.name
  end

  field :created_by_name do |record|
    record.created_by&.email
  end

  field :updated_by_name do |record|
    record.updated_by&.email
  end

  field :filled do |record|
    record.filled?
  end

  field :has_document do |record|
    record.document.attached?
  end

  field :document_url do |record, options|
    next unless record.document.attached?

    helpers = options[:url_helpers] || Rails.application.routes.url_helpers
    helpers.rails_blob_url(record.document, only_path: !options[:full_url])
  end

  field :document_filename do |record|
    record.document.filename.to_s if record.document.attached?
  end
end
