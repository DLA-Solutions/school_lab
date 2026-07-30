# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_30_050634) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "vector"

  create_table "audits", force: :cascade do |t|
    t.string "action"
    t.integer "associated_id"
    t.string "associated_type"
    t.integer "auditable_id"
    t.string "auditable_type"
    t.jsonb "audited_changes"
    t.string "comment"
    t.datetime "created_at"
    t.string "remote_address"
    t.string "request_uuid"
    t.integer "user_id"
    t.string "user_type"
    t.string "username"
    t.integer "version", default: 0
    t.index ["associated_type", "associated_id"], name: "associated_index"
    t.index ["auditable_type", "auditable_id", "version"], name: "auditable_index"
    t.index ["created_at"], name: "index_audits_on_created_at"
    t.index ["request_uuid"], name: "index_audits_on_request_uuid"
    t.index ["user_id", "user_type"], name: "user_index"
  end

  create_table "device_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "platform", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["token"], name: "index_device_tokens_on_token_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["user_id"], name: "index_device_tokens_on_user_id"
  end

  create_table "memberships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "role", null: false
    t.bigint "school_id"
    t.string "status", default: "active", null: false
    t.datetime "suspended_at"
    t.bigint "suspended_by_id"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["school_id"], name: "index_memberships_on_school_id"
    t.index ["suspended_by_id"], name: "index_memberships_on_suspended_by_id"
    t.index ["user_id", "school_id"], name: "index_memberships_on_user_id_and_school_id_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["user_id"], name: "index_memberships_on_user_id"
  end

  create_table "refresh_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.datetime "revoked_at"
    t.string "token_digest", null: false
    t.bigint "user_id", null: false
    t.index ["token_digest"], name: "index_refresh_tokens_on_token_digest", unique: true
    t.index ["user_id"], name: "index_refresh_tokens_on_user_id"
  end

  create_table "school_groups", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "headquarters_cnpj"
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "schools", force: :cascade do |t|
    t.string "address"
    t.string "cnpj"
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "name"
    t.string "saas_plan"
    t.bigint "school_group_id"
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_schools_on_discarded_by_id"
    t.index ["school_group_id"], name: "index_schools_on_school_group_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "confirmation_sent_at"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.datetime "current_sign_in_at"
    t.string "current_sign_in_ip"
    t.datetime "disabled_at"
    t.bigint "disabled_by_id"
    t.datetime "discarded_at"
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.integer "failed_attempts", default: 0, null: false
    t.datetime "last_sign_in_at"
    t.string "last_sign_in_ip"
    t.datetime "locked_at"
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.integer "sign_in_count", default: 0, null: false
    t.string "status", default: "active", null: false
    t.string "unconfirmed_email"
    t.string "unlock_token"
    t.datetime "updated_at", null: false
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["disabled_by_id"], name: "index_users_on_disabled_by_id"
    t.index ["email"], name: "index_users_on_email_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["unlock_token"], name: "index_users_on_unlock_token", unique: true
  end

  add_foreign_key "device_tokens", "users"
  add_foreign_key "memberships", "schools"
  add_foreign_key "memberships", "users"
  add_foreign_key "memberships", "users", column: "suspended_by_id"
  add_foreign_key "refresh_tokens", "users"
  add_foreign_key "schools", "school_groups"
  add_foreign_key "schools", "users", column: "discarded_by_id"
  add_foreign_key "users", "users", column: "disabled_by_id"
end
