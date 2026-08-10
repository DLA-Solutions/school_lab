# frozen_string_literal: true

class ContractTemplateBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :body_html, :updated_at

  field :logo_url do |template, options|
    next unless template.logo.attached?

    helpers = options[:url_helpers] || Rails.application.routes.url_helpers
    helpers.rails_blob_url(template.logo, only_path: true)
  end

  field :logo_filename do |template|
    template.logo.filename.to_s if template.logo.attached?
  end

  # The editor lists what it may insert; keeping it on the payload stops the two drifting apart.
  field :variables do |_template|
    ContractTemplate::VARIABLES.map { |token, description| { token: token, description: description } }
  end
end
