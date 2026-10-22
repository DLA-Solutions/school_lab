# frozen_string_literal: true

class MinutesBookBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :year, :created_at, :updated_at

  # Counted by the controller for the whole page (`entry_counts: { book_id => n }`), so a list of
  # books costs one query rather than one per row.
  field :entries_count do |book, options|
    options.fetch(:entry_counts, {}).fetch(book.id, 0)
  end
end
