# frozen_string_literal: true

class CreatePermissionsEngineTables < ActiveRecord::Migration[8.1]
  def change
    create_table :segments do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :segments, %i[school_id name],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_segments_on_school_id_and_name_kept"

    create_table :school_role_templates do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.string :system_key
      t.boolean :is_system, null: false, default: false
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :school_role_templates, %i[school_id system_key],
              unique: true,
              where: "system_key IS NOT NULL AND discarded_at IS NULL",
              name: "index_school_role_templates_on_school_id_and_system_key_kept"

    create_table :role_template_permissions do |t|
      t.references :role_template, null: false, foreign_key: { to_table: :school_role_templates }
      t.references :school, null: false, foreign_key: true
      t.string :permission_key, null: false
      t.string :scope_kind, null: false, default: "full"
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :role_template_permissions, %i[role_template_id permission_key],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_role_template_permissions_on_template_and_key_kept"
    add_index :role_template_permissions, %i[school_id permission_key]

    create_table :staff_profiles do |t|
      t.references :membership, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.references :role_template, null: false, foreign_key: { to_table: :school_role_templates }
      t.boolean :is_owner, null: false, default: false
      t.references :segment, foreign_key: true
      t.string :display_title
      t.boolean :also_teaches, null: false, default: false
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :staff_profiles, :membership_id,
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_staff_profiles_on_membership_id_kept"
    add_index :staff_profiles, :school_id,
              unique: true,
              where: "is_owner = true AND discarded_at IS NULL",
              name: "index_staff_profiles_on_school_id_owner_kept"

    create_table :membership_permissions do |t|
      t.references :membership, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.string :permission_key, null: false
      t.string :effect, null: false, default: "grant"
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :membership_permissions, %i[membership_id permission_key],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_membership_permissions_on_membership_and_key_kept"
    add_index :membership_permissions, %i[school_id permission_key]
  end
end
