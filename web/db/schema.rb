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

ActiveRecord::Schema[8.1].define(version: 2026_07_30_185843) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "vector"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "applied_discounts", force: :cascade do |t|
    t.decimal "amount", precision: 12, scale: 2
    t.bigint "charge_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "discount_type"
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["charge_id"], name: "index_applied_discounts_on_charge_id"
    t.index ["school_id"], name: "index_applied_discounts_on_school_id"
  end

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

  create_table "billing_plans", force: :cascade do |t|
    t.decimal "base_amount", precision: 12, scale: 2
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "name"
    t.string "plan_type"
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["school_id"], name: "index_billing_plans_on_school_id"
  end

  create_table "charges", force: :cascade do |t|
    t.string "billing_period"
    t.string "boleto_url"
    t.bigint "contract_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.decimal "discount_amount", precision: 12, scale: 2, default: "0.0"
    t.date "due_date"
    t.bigint "guardian_id", null: false
    t.decimal "late_fee_amount", precision: 12, scale: 2, default: "0.0"
    t.decimal "original_amount", precision: 12, scale: 2
    t.text "pix_copy_paste"
    t.string "psp_charge_id"
    t.bigint "school_id", null: false
    t.string "status", default: "pending", null: false
    t.decimal "total_amount", precision: 12, scale: 2
    t.datetime "updated_at", null: false
    t.index ["contract_id"], name: "index_charges_on_contract_id"
    t.index ["discarded_by_id"], name: "index_charges_on_discarded_by_id"
    t.index ["guardian_id"], name: "index_charges_on_guardian_id"
    t.index ["psp_charge_id"], name: "index_charges_on_psp_charge_id", unique: true, where: "(psp_charge_id IS NOT NULL)"
    t.index ["school_id", "due_date"], name: "index_charges_on_school_id_and_due_date"
    t.index ["school_id", "status"], name: "index_charges_on_school_id_and_status"
    t.index ["school_id"], name: "index_charges_on_school_id"
  end

  create_table "contracts", force: :cascade do |t|
    t.bigint "billing_plan_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.integer "due_day"
    t.date "ends_on"
    t.decimal "negotiated_amount", precision: 12, scale: 2
    t.bigint "school_id", null: false
    t.date "starts_on"
    t.string "status", default: "active", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["billing_plan_id"], name: "index_contracts_on_billing_plan_id"
    t.index ["school_id", "status"], name: "index_contracts_on_school_id_and_status"
    t.index ["school_id"], name: "index_contracts_on_school_id"
    t.index ["student_id"], name: "index_contracts_on_student_id"
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

  create_table "documents", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "document_type"
    t.bigint "documentable_id", null: false
    t.string "documentable_type", null: false
    t.string "rejection_reason"
    t.datetime "reviewed_at"
    t.bigint "school_id", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.bigint "uploaded_by_id"
    t.index ["discarded_by_id"], name: "index_documents_on_discarded_by_id"
    t.index ["documentable_type", "documentable_id"], name: "index_documents_on_documentable"
    t.index ["documentable_type", "documentable_id"], name: "index_documents_on_documentable_type_and_documentable_id"
    t.index ["school_id", "status"], name: "index_documents_on_school_id_and_status"
    t.index ["school_id"], name: "index_documents_on_school_id"
    t.index ["uploaded_by_id"], name: "index_documents_on_uploaded_by_id"
  end

  create_table "guardians", force: :cascade do |t|
    t.string "cpf"
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "email"
    t.string "name"
    t.string "phone"
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["discarded_by_id"], name: "index_guardians_on_discarded_by_id"
    t.index ["school_id"], name: "index_guardians_on_school_id"
    t.index ["user_id"], name: "index_guardians_on_user_id"
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

  create_table "payments", force: :cascade do |t|
    t.bigint "charge_id", null: false
    t.datetime "created_at", null: false
    t.decimal "paid_amount", precision: 12, scale: 2
    t.datetime "paid_at"
    t.string "payment_method"
    t.string "psp_transaction_id"
    t.bigint "school_id", null: false
    t.string "status", default: "confirmed", null: false
    t.datetime "updated_at", null: false
    t.index ["charge_id"], name: "index_payments_on_charge_id"
    t.index ["psp_transaction_id"], name: "index_payments_on_psp_transaction_id", unique: true, where: "(psp_transaction_id IS NOT NULL)"
    t.index ["school_id"], name: "index_payments_on_school_id"
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

  create_table "student_guardians", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.decimal "financial_percentage"
    t.bigint "guardian_id", null: false
    t.boolean "primary_guardian"
    t.bigint "school_id", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["guardian_id", "student_id"], name: "index_student_guardians_on_guardian_id_and_student_id_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["guardian_id"], name: "index_student_guardians_on_guardian_id"
    t.index ["school_id"], name: "index_student_guardians_on_school_id"
    t.index ["student_id"], name: "index_student_guardians_on_student_id"
  end

  create_table "students", force: :cascade do |t|
    t.date "birth_date"
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "name"
    t.bigint "school_id", null: false
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_students_on_discarded_by_id"
    t.index ["school_id", "status"], name: "index_students_on_school_id_and_status"
    t.index ["school_id"], name: "index_students_on_school_id"
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

  create_table "webhook_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "event_type"
    t.text "payload"
    t.datetime "processed_at"
    t.string "psp_event_id", null: false
    t.datetime "updated_at", null: false
    t.index ["psp_event_id"], name: "index_webhook_events_on_psp_event_id", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "applied_discounts", "charges"
  add_foreign_key "applied_discounts", "schools"
  add_foreign_key "billing_plans", "schools"
  add_foreign_key "charges", "contracts"
  add_foreign_key "charges", "guardians"
  add_foreign_key "charges", "schools"
  add_foreign_key "charges", "users", column: "discarded_by_id"
  add_foreign_key "contracts", "billing_plans"
  add_foreign_key "contracts", "schools"
  add_foreign_key "contracts", "students"
  add_foreign_key "device_tokens", "users"
  add_foreign_key "documents", "schools"
  add_foreign_key "documents", "users", column: "discarded_by_id"
  add_foreign_key "documents", "users", column: "uploaded_by_id"
  add_foreign_key "guardians", "schools"
  add_foreign_key "guardians", "users"
  add_foreign_key "guardians", "users", column: "discarded_by_id"
  add_foreign_key "memberships", "schools"
  add_foreign_key "memberships", "users"
  add_foreign_key "memberships", "users", column: "suspended_by_id"
  add_foreign_key "payments", "charges"
  add_foreign_key "payments", "schools"
  add_foreign_key "refresh_tokens", "users"
  add_foreign_key "schools", "school_groups"
  add_foreign_key "schools", "users", column: "discarded_by_id"
  add_foreign_key "student_guardians", "guardians"
  add_foreign_key "student_guardians", "schools"
  add_foreign_key "student_guardians", "students"
  add_foreign_key "students", "schools"
  add_foreign_key "students", "users", column: "discarded_by_id"
  add_foreign_key "users", "users", column: "disabled_by_id"
end
