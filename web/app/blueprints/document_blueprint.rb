# frozen_string_literal: true

class DocumentBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :document_type, :status, :rejection_reason, :reviewed_at, :created_at, :updated_at

  # Set only on inactivated documents, which guardians never receive. Users carry no display
  # name, so the inactivating user is identified by e-mail (same as the other `*_by_name` fields).
  field :discarded_at

  field :discarded_by_name do |document|
    document.discarded_by&.email
  end

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

  # "Meus documentos": enough to show whose document it is and who sent it, without a second
  # request. The caller preloads `documentable` and `uploaded_by: :guardians`.
  view :family do
    field :student_id do |document|
      document.documentable_id if document.documentable_type == "Student"
    end

    field :student_name do |document|
      document.documentable.name if document.documentable_type == "Student"
    end

    # The parent's name when a guardian sent it. Users carry no display name, and staff
    # uploads are shown as "the school", so this is null for those.
    field :uploaded_by_name do |document|
      sent_by_guardian(document)&.name
    end

    # "guardian" when a parent sent it, "school" when staff did.
    field :uploaded_by_kind do |document|
      next unless document.uploaded_by

      sent_by_guardian(document) ? "guardian" : "school"
    end
  end

  # Walks the preloaded guardians of the uploader — a query here would be one per document.
  def self.sent_by_guardian(document)
    document.uploaded_by&.guardians&.find { |g| g.school_id == document.school_id && g.kept? }
  end
end
