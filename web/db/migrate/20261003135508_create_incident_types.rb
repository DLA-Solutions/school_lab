# frozen_string_literal: true

class CreateIncidentTypes < ActiveRecord::Migration[8.1]
  def change
    create_table :incident_types do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.string :category, null: false
      t.string :severity
      t.string :default_visibility, null: false, default: "staff_only"
      t.boolean :is_system, null: false, default: false
      t.string :system_key
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :incident_types,
              %i[school_id name],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_incident_types_on_school_id_and_name"

    add_index :incident_types,
              %i[school_id system_key],
              unique: true,
              where: "system_key IS NOT NULL AND discarded_at IS NULL",
              name: "index_incident_types_on_school_id_and_system_key"
  end
end
