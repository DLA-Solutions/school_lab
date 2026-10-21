# frozen_string_literal: true

# Accent-insensitive search (e.g. a participant typed as "Jose" finds "José") — BR-LA07.
class EnableUnaccentExtension < ActiveRecord::Migration[8.1]
  def change
    enable_extension "unaccent"
  end
end
