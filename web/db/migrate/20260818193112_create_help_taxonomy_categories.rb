# frozen_string_literal: true

class CreateHelpTaxonomyCategories < ActiveRecord::Migration[8.1]
  def change
    create_table :help_taxonomy_categories do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :module_key
      t.jsonb :persona_tags, null: false, default: []
      t.integer :position, null: false, default: 0
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :help_taxonomy_categories, :slug, unique: true, where: "discarded_at IS NULL"
    add_index :help_taxonomy_categories, :position
  end
end
