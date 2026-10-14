class CreateCrmContacts < ActiveRecord::Migration[8.1]
  def change
    create_table :crm_contacts do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.string :phone
      t.string :email
      t.text :notes
      t.string :temperature, null: false, default: "cold"
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :crm_contacts, %i[school_id temperature]
  end
end
