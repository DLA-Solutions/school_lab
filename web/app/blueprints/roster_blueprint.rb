# frozen_string_literal: true

class RosterBlueprint < Blueprinter::Base
  fields :student_id, :student_name, :school_class_id, :conversation_id, :sender_line

  # Director rows keep destinations and omit teacher_id. Other actors always
  # include it, null for secretary and coordination.
  field :teacher_id, if: ->(_field_name, row, _options) { row.destinations.nil? }

  field :destinations, if: ->(_field_name, row, _options) { !row.destinations.nil? } do |row|
    DestinationBlueprint.render_as_hash(row.destinations)
  end
end
