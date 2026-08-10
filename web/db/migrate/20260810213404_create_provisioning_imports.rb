# frozen_string_literal: true

class CreateProvisioningImports < ActiveRecord::Migration[8.1]
  def change
    create_table :provisioning_imports do |t|
      t.references :school, null: false, foreign_key: true
      t.references :uploaded_by, null: false, foreign_key: { to_table: :users }
      t.string :status, null: false, default: "previewed"
      t.integer :row_count
      t.jsonb :error_report
      t.datetime :committed_at

      t.timestamps
    end

    add_index :provisioning_imports, [ :school_id, :created_at ]
  end
end
