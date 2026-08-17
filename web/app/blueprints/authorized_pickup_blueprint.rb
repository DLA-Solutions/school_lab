# frozen_string_literal: true

class AuthorizedPickupBlueprint < Blueprinter::Base
  identifier :id

  fields :student_id, :name, :phone, :created_at

  # Canonical 11 digits, like every other document here; clients format it for display.
  field :cpf

  # Whoever is at the gate has to be recognised by staff who never met them, so the listing says
  # outright whether there is a face to check against.
  field :has_photo do |pickup|
    pickup.photo.attached?
  end

  # Host-relative, as Active Storage returns it; the client puts the API origin back on.
  field :photo_url do |pickup, options|
    next unless pickup.photo.attached?

    helpers = options[:url_helpers] || Rails.application.routes.url_helpers
    helpers.rails_blob_url(pickup.photo, only_path: !options[:full_url])
  end

  field :created_by_name do |pickup|
    pickup.created_by&.email
  end
end
