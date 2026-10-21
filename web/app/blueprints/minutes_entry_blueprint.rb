# frozen_string_literal: true

# `:summary` for lists (participants without contact data), `:detail` for show and write responses
# (body, participants with a masked CPF). The provider's document id and signed-file URL are never
# exposed: the signed copy is served through `GET /minutes_entries/:id/pdf`.
class MinutesEntryBlueprint < Blueprinter::Base
  identifier :id

  view :summary do
    fields :minutes_book_id, :school_class_id, :kind, :title, :held_on, :status,
           :signature_requested_at, :signed_at, :cancelled_at, :created_at, :updated_at

    field :book do |entry|
      { id: entry.minutes_book_id, name: entry.minutes_book.name, year: entry.minutes_book.year }
    end

    association :minutes_participants, name: :participants,
                                       blueprint: MinutesParticipantBlueprint, view: :summary
  end

  view :detail do
    fields :minutes_book_id, :school_class_id, :kind, :title, :held_on, :status, :body,
           :signature_provider, :signature_requested_at, :signed_at, :cancelled_at,
           :created_by_membership_id, :school_id, :created_at, :updated_at

    field :book do |entry|
      { id: entry.minutes_book_id, name: entry.minutes_book.name, year: entry.minutes_book.year }
    end

    field :sent_to_provider do |entry|
      entry.provider_document_id.present?
    end

    # Whether `GET /pdf` will return the provider's signed copy rather than a fresh render.
    field :has_signed_pdf do |entry|
      entry.signed? && (entry.pdf.attached? || entry.signed_document_url.present?)
    end

    association :minutes_participants, name: :participants,
                                       blueprint: MinutesParticipantBlueprint, view: :detail
  end
end
