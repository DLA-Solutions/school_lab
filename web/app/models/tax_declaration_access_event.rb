# frozen_string_literal: true

class TaxDeclarationAccessEvent < ApplicationRecord
  EVENT_TYPES = %w[pdf_download].freeze

  belongs_to :school
  belongs_to :tax_declaration
  belongs_to :tax_declaration_version
  belongs_to :guardian
  belongs_to :actor_user, class_name: "User"

  validates :event_type, inclusion: { in: EVENT_TYPES }
  validates :request_uuid, presence: true, uniqueness: true
  validates :occurred_at, presence: true
end
