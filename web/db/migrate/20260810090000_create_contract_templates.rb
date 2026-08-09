# frozen_string_literal: true

# The agreement a school sends out, editable as HTML so its wording can change without a deploy.
# The letterhead rides along as an Active Storage attachment.
class CreateContractTemplates < ActiveRecord::Migration[8.1]
  def change
    create_table :contract_templates do |t|
      t.references :school, null: false, foreign_key: true
      t.text :body_html, null: false

      # Where the signature field goes, as a percentage of the page from its top-left corner —
      # the units Autentique takes. Held here because the school owns the layout now.
      t.decimal :signature_x, precision: 5, scale: 2, default: 10.0, null: false
      t.decimal :signature_y, precision: 5, scale: 2, default: 85.0, null: false
      t.integer :signature_page, default: 1, null: false

      t.references :updated_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    # One agreement per school.
    add_index :contract_templates, :school_id, unique: true, name: "index_contract_templates_on_school"

    add_check_constraint :contract_templates,
                         "signature_x >= 0 AND signature_x <= 100 AND signature_y >= 0 AND signature_y <= 100",
                         name: "contract_templates_signature_position_range"

    add_check_constraint :contract_templates,
                         "signature_page >= 1",
                         name: "contract_templates_signature_page_positive"
  end
end
