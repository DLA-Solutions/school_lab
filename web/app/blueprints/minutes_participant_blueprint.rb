# frozen_string_literal: true

# Participants of an ata. The list view carries no contact data at all; the detail view adds the
# e-mail and a masked CPF (BR-LA09) — the full CPF never leaves the server.
class MinutesParticipantBlueprint < Blueprinter::Base
  identifier :id

  view :summary do
    fields :name, :role_label, :signs
  end

  view :detail do
    include_view :summary
    fields :email, :signed_at, :membership_id, :guardian_id, :student_id

    field :cpf do |participant|
      participant.masked_cpf
    end
  end
end
