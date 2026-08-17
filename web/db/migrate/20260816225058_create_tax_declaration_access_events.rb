# frozen_string_literal: true

class CreateTaxDeclarationAccessEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :tax_declaration_access_events do |t|
      t.references :school, null: false, foreign_key: true
      t.references :tax_declaration, null: false, foreign_key: true
      t.references :tax_declaration_version, null: false, foreign_key: true
      t.references :guardian, null: false, foreign_key: true
      t.references :actor_user, null: false, foreign_key: { to_table: :users }
      t.string :event_type, null: false, default: "pdf_download"
      t.string :request_uuid, null: false
      t.datetime :occurred_at, null: false

      t.timestamps
    end

    add_index :tax_declaration_access_events, :request_uuid, unique: true
    add_index :tax_declaration_access_events,
              %i[school_id guardian_id occurred_at],
              name: "index_tax_declaration_access_events_on_school_guardian_time"
    add_index :tax_declaration_access_events,
              %i[tax_declaration_version_id occurred_at],
              name: "index_tax_declaration_access_events_on_version_time"
  end
end
