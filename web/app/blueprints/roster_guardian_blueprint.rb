# frozen_string_literal: true

# One line per guardian on a roster search hit — just enough for staff to recognize the family.
# Mirrors DestinationBlueprint's minimal, nesting-only shape.
class RosterGuardianBlueprint < Blueprinter::Base
  fields :name, :relationship
end
