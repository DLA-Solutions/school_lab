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

ActiveRecord::Schema[8.1].define(version: 2026_08_09_140200) do
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
    t.integer "amount_cents"
    t.bigint "charge_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "discount_type"
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["charge_id"], name: "index_applied_discounts_on_charge_id"
    t.index ["school_id"], name: "index_applied_discounts_on_school_id"
    t.check_constraint "amount_cents IS NULL OR amount_cents >= 0", name: "applied_discounts_amount_cents_non_negative"
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
    t.integer "base_amount_cents"
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "name"
    t.string "plan_type"
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["school_id"], name: "index_billing_plans_on_school_id"
    t.check_constraint "base_amount_cents IS NULL OR base_amount_cents >= 0", name: "billing_plans_base_amount_cents_non_negative"
  end

  create_table "charge_issuances", force: :cascade do |t|
    t.integer "amount_cents", null: false
    t.string "barcode"
    t.string "boleto_url"
    t.datetime "cancelled_at"
    t.bigint "charge_id", null: false
    t.datetime "created_at", null: false
    t.string "digitable_line"
    t.date "due_date", null: false
    t.string "idempotency_key", null: false
    t.datetime "issued_at"
    t.text "last_error"
    t.string "our_number"
    t.text "pix_emv"
    t.string "provider", null: false
    t.string "provider_invoice_id"
    t.bigint "school_id", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["charge_id", "status"], name: "index_charge_issuances_on_charge_id_and_status"
    t.index ["charge_id"], name: "index_charge_issuances_on_charge_id"
    t.index ["idempotency_key"], name: "index_charge_issuances_on_idempotency_key", unique: true
    t.index ["provider_invoice_id"], name: "index_charge_issuances_on_provider_invoice_id", unique: true, where: "(provider_invoice_id IS NOT NULL)"
    t.index ["school_id"], name: "index_charge_issuances_on_school_id"
    t.check_constraint "amount_cents >= 0", name: "charge_issuances_amount_cents_non_negative"
  end

  create_table "charges", force: :cascade do |t|
    t.date "billing_period", null: false
    t.string "boleto_url"
    t.datetime "cancelled_at"
    t.bigint "contract_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.integer "discount_amount_cents", default: 0, null: false
    t.date "due_date"
    t.bigint "guardian_id", null: false
    t.integer "late_fee_amount_cents", default: 0, null: false
    t.integer "original_amount_cents", null: false
    t.datetime "overdue_at"
    t.datetime "paid_at"
    t.text "pix_copy_paste"
    t.string "provider_invoice_id"
    t.bigint "school_id", null: false
    t.string "status", default: "pending", null: false
    t.integer "total_amount_cents", null: false
    t.datetime "updated_at", null: false
    t.index ["contract_id", "billing_period"], name: "index_charges_on_contract_id_and_billing_period_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["contract_id"], name: "index_charges_on_contract_id"
    t.index ["discarded_by_id"], name: "index_charges_on_discarded_by_id"
    t.index ["guardian_id"], name: "index_charges_on_guardian_id"
    t.index ["provider_invoice_id"], name: "index_charges_on_provider_invoice_id", unique: true, where: "(provider_invoice_id IS NOT NULL)"
    t.index ["school_id", "due_date"], name: "index_charges_on_school_id_and_due_date"
    t.index ["school_id", "status"], name: "index_charges_on_school_id_and_status"
    t.index ["school_id"], name: "index_charges_on_school_id"
    t.check_constraint "discount_amount_cents >= 0", name: "charges_discount_amount_cents_non_negative"
    t.check_constraint "late_fee_amount_cents >= 0", name: "charges_late_fee_amount_cents_non_negative"
    t.check_constraint "original_amount_cents >= 0", name: "charges_original_amount_cents_non_negative"
    t.check_constraint "total_amount_cents >= 0", name: "charges_total_amount_cents_non_negative"
  end

  create_table "contracts", force: :cascade do |t|
    t.bigint "billing_plan_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.integer "due_day"
    t.date "ends_on"
    t.integer "negotiated_amount_cents"
    t.bigint "school_id", null: false
    t.datetime "sent_at"
    t.string "signature_status", default: "pending_signature", null: false
    t.datetime "signed_at"
    t.date "starts_on"
    t.string "status", default: "active", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["billing_plan_id"], name: "index_contracts_on_billing_plan_id"
    t.index ["school_id", "signature_status"], name: "index_contracts_on_school_id_and_signature_status"
    t.index ["school_id", "status"], name: "index_contracts_on_school_id_and_status"
    t.index ["school_id"], name: "index_contracts_on_school_id"
    t.index ["student_id"], name: "index_contracts_on_student_id"
    t.check_constraint "negotiated_amount_cents IS NULL OR negotiated_amount_cents >= 0", name: "contracts_negotiated_amount_cents_non_negative"
    t.check_constraint "signature_status::text = ANY (ARRAY['pending_signature'::character varying, 'signed'::character varying]::text[])", name: "contracts_signature_status_valid"
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
    t.string "city"
    t.string "complement"
    t.string "cpf"
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "email"
    t.string "name"
    t.string "neighborhood"
    t.string "number"
    t.string "phone"
    t.bigint "school_id", null: false
    t.string "state", limit: 2
    t.string "street"
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.string "zip_code", limit: 8
    t.index ["discarded_by_id"], name: "index_guardians_on_discarded_by_id"
    t.index ["school_id", "cpf"], name: "index_guardians_on_school_id_and_cpf_kept", unique: true, where: "((discarded_at IS NULL) AND (cpf IS NOT NULL))"
    t.index ["school_id"], name: "index_guardians_on_school_id"
    t.index ["user_id"], name: "index_guardians_on_user_id"
    t.check_constraint "state IS NULL OR state::text ~ '^[A-Z]{2}$'::text", name: "guardians_state_format"
    t.check_constraint "zip_code IS NULL OR zip_code::text ~ '^[0-9]{8}$'::text", name: "guardians_zip_code_format"
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
    t.integer "fine_amount_cents", default: 0, null: false
    t.integer "interest_amount_cents", default: 0, null: false
    t.integer "paid_amount_cents", null: false
    t.datetime "paid_at"
    t.string "payment_method"
    t.string "provider_payment_id"
    t.bigint "school_id", null: false
    t.string "status", default: "confirmed", null: false
    t.datetime "updated_at", null: false
    t.index ["charge_id"], name: "index_payments_on_charge_id"
    t.index ["provider_payment_id"], name: "index_payments_on_provider_payment_id", unique: true, where: "(provider_payment_id IS NOT NULL)"
    t.index ["school_id"], name: "index_payments_on_school_id"
    t.check_constraint "fine_amount_cents >= 0", name: "payments_fine_amount_cents_non_negative"
    t.check_constraint "interest_amount_cents >= 0", name: "payments_interest_amount_cents_non_negative"
    t.check_constraint "paid_amount_cents >= 0", name: "payments_paid_amount_cents_non_negative"
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

  create_table "school_billing_settings", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.decimal "interest_rate_percent", precision: 5, scale: 2
    t.jsonb "notification_schedule", default: {}, null: false
    t.integer "overdue_grace_days", default: 3, null: false
    t.bigint "school_id", null: false
    t.string "service_description", limit: 100
    t.datetime "updated_at", null: false
    t.index ["school_id"], name: "index_school_billing_settings_on_school_id", unique: true
    t.check_constraint "interest_rate_percent IS NULL OR interest_rate_percent > 0::numeric AND interest_rate_percent <= 100::numeric", name: "school_billing_settings_interest_rate_percent_range"
    t.check_constraint "overdue_grace_days >= 0 AND overdue_grace_days <= 30", name: "school_billing_settings_overdue_grace_days_range"
  end

  create_table "school_classes", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "grade_level", null: false
    t.string "name", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.integer "year", null: false
    t.index ["discarded_by_id"], name: "index_school_classes_on_discarded_by_id"
    t.index ["school_id", "year", "grade_level", "name"], name: "index_school_classes_on_school_year_grade_name_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_id"], name: "index_school_classes_on_school_id"
  end

  create_table "school_groups", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "headquarters_cnpj"
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "school_payment_providers", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "certificate_expires_at"
    t.string "certificate_fingerprint"
    t.text "certificate_pem"
    t.string "client_id"
    t.datetime "created_at", null: false
    t.string "instrument", null: false
    t.text "private_key_pem"
    t.string "provider", null: false
    t.bigint "school_id", null: false
    t.jsonb "settings", default: {}, null: false
    t.datetime "updated_at", null: false
    t.datetime "uploaded_at"
    t.bigint "uploaded_by_id"
    t.string "webhook_endpoint_token", null: false
    t.index ["school_id", "instrument"], name: "index_school_payment_providers_active_pair", unique: true, where: "(active = true)"
    t.index ["school_id"], name: "index_school_payment_providers_on_school_id"
    t.index ["uploaded_by_id"], name: "index_school_payment_providers_on_uploaded_by_id"
    t.index ["webhook_endpoint_token"], name: "index_school_payment_providers_on_webhook_endpoint_token", unique: true
    t.check_constraint "instrument::text = 'bank_slip'::text", name: "school_payment_providers_instrument_allowed"
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

  create_table "solid_cache_entries", force: :cascade do |t|
    t.integer "byte_size", null: false
    t.datetime "created_at", null: false
    t.binary "key", null: false
    t.bigint "key_hash", null: false
    t.binary "value", null: false
    t.index ["byte_size"], name: "index_solid_cache_entries_on_byte_size"
    t.index ["key_hash", "byte_size"], name: "index_solid_cache_entries_on_key_hash_and_byte_size"
    t.index ["key_hash"], name: "index_solid_cache_entries_on_key_hash", unique: true
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.string "concurrency_key", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "error"
    t.bigint "job_id", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "active_job_id"
    t.text "arguments"
    t.string "class_name", null: false
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "finished_at"
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at"
    t.datetime "updated_at", null: false
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "queue_name", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "hostname"
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.text "metadata"
    t.string "name", null: false
    t.integer "pid", null: false
    t.bigint "supervisor_id"
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.datetime "run_at", null: false
    t.string "task_key", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.text "arguments"
    t.string "class_name"
    t.string "command", limit: 2048
    t.datetime "created_at", null: false
    t.text "description"
    t.string "key", null: false
    t.integer "priority", default: 0
    t.string "queue_name"
    t.string "schedule", null: false
    t.boolean "static", default: true, null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.integer "value", default: 1, null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "student_guardians", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.decimal "financial_percentage", precision: 5, scale: 2
    t.bigint "guardian_id", null: false
    t.boolean "primary_guardian"
    t.string "relationship", default: "other", null: false
    t.bigint "school_id", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["guardian_id", "student_id"], name: "index_student_guardians_on_guardian_id_and_student_id_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["guardian_id"], name: "index_student_guardians_on_guardian_id"
    t.index ["school_id"], name: "index_student_guardians_on_school_id"
    t.index ["student_id", "relationship"], name: "index_student_guardians_on_student_and_parent_kept", unique: true, where: "((discarded_at IS NULL) AND ((relationship)::text = ANY ((ARRAY['father'::character varying, 'mother'::character varying])::text[])))"
    t.index ["student_id"], name: "index_student_guardians_on_student_id"
    t.check_constraint "financial_percentage IS NULL OR financial_percentage >= 0::numeric AND financial_percentage <= 100::numeric", name: "student_guardians_financial_percentage_range"
    t.check_constraint "relationship::text = ANY (ARRAY['father'::character varying, 'mother'::character varying, 'other'::character varying]::text[])", name: "student_guardians_relationship_valid"
  end

  create_table "students", force: :cascade do |t|
    t.date "birth_date"
    t.string "cpf", limit: 11
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "name"
    t.string "rg"
    t.bigint "school_class_id"
    t.bigint "school_id", null: false
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_students_on_discarded_by_id"
    t.index ["school_class_id"], name: "index_students_on_school_class_id"
    t.index ["school_id", "cpf"], name: "index_students_on_school_id_and_cpf_kept", unique: true, where: "((discarded_at IS NULL) AND (cpf IS NOT NULL))"
    t.index ["school_id", "status"], name: "index_students_on_school_id_and_status"
    t.index ["school_id"], name: "index_students_on_school_id"
    t.check_constraint "cpf IS NULL OR cpf::text ~ '^[0-9]{11}$'::text", name: "students_cpf_format"
  end

  create_table "subjects", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "name", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_subjects_on_discarded_by_id"
    t.index ["school_id", "name"], name: "index_subjects_on_school_id_and_name_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_id"], name: "index_subjects_on_school_id"
  end

  create_table "teachers", force: :cascade do |t|
    t.string "cpf", limit: 11
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "email"
    t.string "name", null: false
    t.string "phone"
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_teachers_on_discarded_by_id"
    t.index ["school_id", "cpf"], name: "index_teachers_on_school_id_and_cpf_kept", unique: true, where: "((discarded_at IS NULL) AND (cpf IS NOT NULL))"
    t.index ["school_id"], name: "index_teachers_on_school_id"
    t.check_constraint "cpf IS NULL OR cpf::text ~ '^[0-9]{11}$'::text", name: "teachers_cpf_format"
  end

  create_table "teaching_assignments", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.bigint "school_class_id", null: false
    t.bigint "school_id", null: false
    t.bigint "subject_id", null: false
    t.bigint "teacher_id", null: false
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_teaching_assignments_on_discarded_by_id"
    t.index ["school_class_id"], name: "index_teaching_assignments_on_school_class_id"
    t.index ["school_id"], name: "index_teaching_assignments_on_school_id"
    t.index ["subject_id"], name: "index_teaching_assignments_on_subject_id"
    t.index ["teacher_id", "school_class_id", "subject_id"], name: "index_teaching_assignments_unique_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["teacher_id"], name: "index_teaching_assignments_on_teacher_id"
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
    t.string "observed_status"
    t.text "payload"
    t.datetime "processed_at"
    t.text "processing_error"
    t.string "provider", null: false
    t.string "provider_event_id", null: false
    t.string "provider_resource_id"
    t.bigint "school_id"
    t.datetime "updated_at", null: false
    t.index ["provider", "provider_event_id"], name: "index_webhook_events_on_provider_and_provider_event_id", unique: true
    t.index ["school_id"], name: "index_webhook_events_on_school_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "applied_discounts", "charges"
  add_foreign_key "applied_discounts", "schools"
  add_foreign_key "billing_plans", "schools"
  add_foreign_key "charge_issuances", "charges"
  add_foreign_key "charge_issuances", "schools"
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
  add_foreign_key "school_billing_settings", "schools"
  add_foreign_key "school_classes", "schools"
  add_foreign_key "school_classes", "users", column: "discarded_by_id"
  add_foreign_key "school_payment_providers", "schools"
  add_foreign_key "school_payment_providers", "users", column: "uploaded_by_id"
  add_foreign_key "schools", "school_groups"
  add_foreign_key "schools", "users", column: "discarded_by_id"
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "student_guardians", "guardians"
  add_foreign_key "student_guardians", "schools"
  add_foreign_key "student_guardians", "students"
  add_foreign_key "students", "school_classes"
  add_foreign_key "students", "schools"
  add_foreign_key "students", "users", column: "discarded_by_id"
  add_foreign_key "subjects", "schools"
  add_foreign_key "subjects", "users", column: "discarded_by_id"
  add_foreign_key "teachers", "schools"
  add_foreign_key "teachers", "users", column: "discarded_by_id"
  add_foreign_key "teaching_assignments", "school_classes"
  add_foreign_key "teaching_assignments", "schools"
  add_foreign_key "teaching_assignments", "subjects"
  add_foreign_key "teaching_assignments", "teachers"
  add_foreign_key "teaching_assignments", "users", column: "discarded_by_id"
  add_foreign_key "users", "users", column: "disabled_by_id"
  add_foreign_key "webhook_events", "schools"
end
