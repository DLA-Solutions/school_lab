# frozen_string_literal: true

class CreateReportCardConfigs < ActiveRecord::Migration[8.1]
  def change
    create_table :report_card_configs do |t|
      t.references :school, null: false, foreign_key: true
      t.integer :version, null: false
      t.string :template_key, null: false
      t.jsonb :display_config, null: false, default: {}
      t.text :header_text
      t.text :footer_text
      t.references :document_signatory, null: false, foreign_key: true
      t.references :created_by_membership, null: false, foreign_key: { to_table: :memberships }

      t.timestamps
    end

    add_index :report_card_configs, %i[school_id version], unique: true
  end
end
