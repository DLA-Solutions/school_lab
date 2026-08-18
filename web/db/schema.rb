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

ActiveRecord::Schema[8.1].define(version: 2026_08_17_211221) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "pg_catalog.plpgsql"

  create_table "academic_periods", force: :cascade do |t|
    t.jsonb "attendance_policy_override"
    t.string "closure_status", default: "open", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.date "ends_on", null: false
    t.string "name", null: false
    t.bigint "school_id", null: false
    t.bigint "school_year_id", null: false
    t.integer "sequence", null: false
    t.date "starts_on", null: false
    t.datetime "updated_at", null: false
    t.index ["school_id"], name: "index_academic_periods_on_school_id"
    t.index ["school_year_id", "sequence"], name: "index_academic_periods_on_year_sequence_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_year_id"], name: "index_academic_periods_on_school_year_id"
    t.check_constraint "ends_on >= starts_on", name: "academic_periods_dates_valid"
    t.exclusion_constraint "school_year_id WITH =, daterange(starts_on, ends_on, '[]'::text) WITH &&", where: "discarded_at IS NULL", using: :gist, name: "academic_periods_no_overlap_kept"
  end

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

  create_table "attendance_policies", force: :cascade do |t|
    t.integer "auto_confirm_absence_after_minutes", default: 15, null: false
    t.string "counting_mode", default: "lesson", null: false
    t.datetime "created_at", null: false
    t.boolean "late_counts_as_absence", default: false, null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["school_id"], name: "index_attendance_policies_on_school_id", unique: true
    t.check_constraint "auto_confirm_absence_after_minutes > 0", name: "attendance_policies_auto_confirm_positive"
  end

  create_table "attendance_records", force: :cascade do |t|
    t.datetime "absence_notified_at"
    t.bigint "attendance_session_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "school_id", null: false
    t.string "status", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["attendance_session_id", "student_id"], name: "index_attendance_records_on_session_student_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["attendance_session_id"], name: "index_attendance_records_on_attendance_session_id"
    t.index ["school_id"], name: "index_attendance_records_on_school_id"
    t.index ["student_id"], name: "index_attendance_records_on_student_id"
  end

  create_table "attendance_sessions", force: :cascade do |t|
    t.bigint "academic_period_id"
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "lesson_id"
    t.bigint "recorded_by_membership_id"
    t.bigint "school_class_id", null: false
    t.bigint "school_id", null: false
    t.bigint "school_year_id", null: false
    t.date "session_date", null: false
    t.datetime "updated_at", null: false
    t.index ["academic_period_id"], name: "index_attendance_sessions_on_academic_period_id"
    t.index ["recorded_by_membership_id"], name: "index_attendance_sessions_on_recorded_by_membership_id"
    t.index ["school_class_id", "academic_period_id", "session_date"], name: "index_attendance_sessions_period_total_kept", unique: true, where: "((lesson_id IS NULL) AND (discarded_at IS NULL))"
    t.index ["school_class_id", "session_date", "lesson_id"], name: "index_attendance_sessions_on_class_date_lesson_kept", unique: true, where: "((lesson_id IS NOT NULL) AND (discarded_at IS NULL))"
    t.index ["school_class_id"], name: "index_attendance_sessions_on_school_class_id"
    t.index ["school_id"], name: "index_attendance_sessions_on_school_id"
    t.index ["school_year_id"], name: "index_attendance_sessions_on_school_year_id"
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

  create_table "authorized_pickups", force: :cascade do |t|
    t.string "cpf", null: false
    t.datetime "created_at", null: false
    t.bigint "created_by_id"
    t.datetime "discarded_at"
    t.string "name", null: false
    t.string "phone"
    t.bigint "school_id", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_authorized_pickups_on_created_by_id"
    t.index ["school_id"], name: "index_authorized_pickups_on_school_id"
    t.index ["student_id", "cpf"], name: "index_authorized_pickups_on_student_and_cpf_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["student_id", "discarded_at"], name: "index_authorized_pickups_on_student_id_and_discarded_at"
    t.index ["student_id"], name: "index_authorized_pickups_on_student_id"
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

  create_table "billing_purposes", force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "name", null: false
    t.bigint "school_id", null: false
    t.boolean "tax_declaration_eligible", default: false, null: false
    t.datetime "updated_at", null: false
    t.index ["school_id", "code"], name: "index_billing_purposes_on_school_id_and_code_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_id"], name: "index_billing_purposes_on_school_id"
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
    t.string "billing_purpose_code"
    t.bigint "billing_purpose_id"
    t.string "boleto_url"
    t.datetime "cancelled_at"
    t.bigint "contract_id"
    t.datetime "created_at", null: false
    t.string "description"
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.integer "discount_amount_cents", default: 0, null: false
    t.date "due_date"
    t.bigint "guardian_id", null: false
    t.string "kind", default: "tuition", null: false
    t.integer "late_fee_amount_cents", default: 0, null: false
    t.integer "original_amount_cents", null: false
    t.datetime "overdue_at"
    t.datetime "paid_at"
    t.text "pix_copy_paste"
    t.string "provider_invoice_id"
    t.bigint "school_id", null: false
    t.string "status", default: "pending", null: false
    t.boolean "tax_declaration_eligible", default: false, null: false
    t.integer "total_amount_cents", null: false
    t.datetime "updated_at", null: false
    t.index ["billing_purpose_id"], name: "index_charges_on_billing_purpose_id"
    t.index ["contract_id", "billing_period"], name: "index_charges_on_contract_period_tuition_kept", unique: true, where: "((discarded_at IS NULL) AND ((kind)::text = 'tuition'::text))"
    t.index ["contract_id"], name: "index_charges_on_contract_id"
    t.index ["discarded_by_id"], name: "index_charges_on_discarded_by_id"
    t.index ["guardian_id"], name: "index_charges_on_guardian_id"
    t.index ["provider_invoice_id"], name: "index_charges_on_provider_invoice_id", unique: true, where: "(provider_invoice_id IS NOT NULL)"
    t.index ["school_id", "due_date"], name: "index_charges_on_school_id_and_due_date"
    t.index ["school_id", "status"], name: "index_charges_on_school_id_and_status"
    t.index ["school_id"], name: "index_charges_on_school_id"
    t.check_constraint "discount_amount_cents >= 0", name: "charges_discount_amount_cents_non_negative"
    t.check_constraint "kind::text = ANY (ARRAY['tuition'::character varying, 'one_off'::character varying]::text[])", name: "charges_kind_allowed"
    t.check_constraint "late_fee_amount_cents >= 0", name: "charges_late_fee_amount_cents_non_negative"
    t.check_constraint "original_amount_cents >= 0", name: "charges_original_amount_cents_non_negative"
    t.check_constraint "total_amount_cents >= 0", name: "charges_total_amount_cents_non_negative"
  end

  create_table "class_disciplines", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.boolean "required_on_report_card", default: true, null: false
    t.bigint "school_class_id", null: false
    t.bigint "school_id", null: false
    t.bigint "school_year_id", null: false
    t.bigint "subject_id", null: false
    t.bigint "teacher_id"
    t.datetime "updated_at", null: false
    t.index ["school_class_id", "subject_id"], name: "index_class_disciplines_on_class_subject_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_class_id"], name: "index_class_disciplines_on_school_class_id"
    t.index ["school_id"], name: "index_class_disciplines_on_school_id"
    t.index ["school_year_id"], name: "index_class_disciplines_on_school_year_id"
    t.index ["subject_id"], name: "index_class_disciplines_on_subject_id"
    t.index ["teacher_id"], name: "index_class_disciplines_on_teacher_id"
  end

  create_table "collection_reminder_deliveries", force: :cascade do |t|
    t.bigint "charge_id", null: false
    t.datetime "created_at", null: false
    t.string "rule_key", null: false
    t.bigint "school_id", null: false
    t.date "sent_on", null: false
    t.datetime "updated_at", null: false
    t.index ["charge_id", "rule_key", "sent_on"], name: "index_collection_reminder_deliveries_on_charge_rule_sent_on", unique: true
    t.index ["charge_id"], name: "index_collection_reminder_deliveries_on_charge_id"
    t.index ["school_id", "sent_on"], name: "index_collection_reminder_deliveries_on_school_id_and_sent_on"
    t.index ["school_id"], name: "index_collection_reminder_deliveries_on_school_id"
  end

  create_table "contract_templates", force: :cascade do |t|
    t.text "body_html", null: false
    t.string "copy_emails", default: [], null: false, array: true
    t.datetime "created_at", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "updated_by_id"
    t.index ["school_id"], name: "index_contract_templates_on_school", unique: true
    t.index ["school_id"], name: "index_contract_templates_on_school_id"
    t.index ["updated_by_id"], name: "index_contract_templates_on_updated_by_id"
  end

  create_table "contracts", force: :cascade do |t|
    t.bigint "billing_plan_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.integer "due_day"
    t.date "ends_on"
    t.integer "negotiated_amount_cents"
    t.bigint "payer_guardian_id"
    t.bigint "plan_discount_id"
    t.string "provider_document_id"
    t.bigint "school_id", null: false
    t.datetime "sent_at"
    t.datetime "signature_cancelled_at"
    t.string "signature_provider"
    t.datetime "signature_requested_at"
    t.string "signature_status", default: "pending_signature", null: false
    t.datetime "signed_at"
    t.string "signed_document_url"
    t.date "starts_on"
    t.string "status", default: "active", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["billing_plan_id"], name: "index_contracts_on_billing_plan_id"
    t.index ["payer_guardian_id"], name: "index_contracts_on_payer_guardian_id"
    t.index ["plan_discount_id"], name: "index_contracts_on_plan_discount_id"
    t.index ["school_id", "signature_status"], name: "index_contracts_on_school_id_and_signature_status"
    t.index ["school_id", "status"], name: "index_contracts_on_school_id_and_status"
    t.index ["school_id"], name: "index_contracts_on_school_id"
    t.index ["signature_provider", "provider_document_id"], name: "index_contracts_on_provider_document", unique: true, where: "(provider_document_id IS NOT NULL)"
    t.index ["student_id"], name: "index_contracts_on_student_id"
    t.check_constraint "negotiated_amount_cents IS NULL OR negotiated_amount_cents >= 0", name: "contracts_negotiated_amount_cents_non_negative"
    t.check_constraint "signature_status::text = ANY (ARRAY['pending_signature'::character varying, 'signed'::character varying, 'cancelled'::character varying]::text[])", name: "contracts_signature_status_valid"
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

  create_table "document_signatories", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "name", null: false
    t.string "role_label", null: false
    t.bigint "school_id", null: false
    t.string "title"
    t.datetime "updated_at", null: false
    t.index ["school_id", "discarded_at"], name: "index_document_signatories_on_school_id_and_discarded_at"
    t.index ["school_id"], name: "index_document_signatories_on_school_id"
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

  create_table "evaluation_components", force: :cascade do |t|
    t.bigint "class_discipline_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "entry_kind", default: "regular", null: false
    t.bigint "evaluation_template_id", null: false
    t.bigint "grade_scale_id", null: false
    t.string "name", null: false
    t.integer "position", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.decimal "weight_percent", precision: 5, scale: 2, null: false
    t.index ["class_discipline_id"], name: "index_evaluation_components_on_class_discipline_id"
    t.index ["evaluation_template_id", "class_discipline_id", "position"], name: "idx_eval_components_template_disc_pos_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["evaluation_template_id"], name: "index_evaluation_components_on_evaluation_template_id"
    t.index ["grade_scale_id"], name: "index_evaluation_components_on_grade_scale_id"
    t.index ["school_id"], name: "index_evaluation_components_on_school_id"
  end

  create_table "evaluation_templates", force: :cascade do |t|
    t.bigint "academic_period_id", null: false
    t.datetime "created_at", null: false
    t.bigint "created_by_membership_id", null: false
    t.datetime "discarded_at"
    t.boolean "lock_on_launch", default: false, null: false
    t.datetime "retired_at"
    t.string "rounding_mode", default: "half_up", null: false
    t.bigint "school_class_id", null: false
    t.bigint "school_id", null: false
    t.bigint "supersedes_id"
    t.datetime "updated_at", null: false
    t.integer "version", null: false
    t.index ["academic_period_id"], name: "index_evaluation_templates_on_academic_period_id"
    t.index ["created_by_membership_id"], name: "index_evaluation_templates_on_created_by_membership_id"
    t.index ["school_class_id"], name: "index_evaluation_templates_on_school_class_id"
    t.index ["school_id", "school_class_id", "academic_period_id", "version"], name: "idx_eval_templates_class_period_version_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_id", "school_class_id", "academic_period_id"], name: "idx_eval_templates_current_per_class_period", unique: true, where: "((retired_at IS NULL) AND (discarded_at IS NULL))"
    t.index ["school_id"], name: "index_evaluation_templates_on_school_id"
    t.index ["supersedes_id"], name: "index_evaluation_templates_on_supersedes_id"
  end

  create_table "grade_entries", force: :cascade do |t|
    t.bigint "academic_period_id", null: false
    t.bigint "activity_id"
    t.bigint "class_discipline_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "entered_by_membership_id"
    t.string "entry_kind", default: "regular", null: false
    t.bigint "evaluation_component_id", null: false
    t.bigint "lesson_id"
    t.bigint "school_id", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.string "value"
    t.index ["academic_period_id"], name: "index_grade_entries_on_academic_period_id"
    t.index ["class_discipline_id"], name: "index_grade_entries_on_class_discipline_id"
    t.index ["entered_by_membership_id"], name: "index_grade_entries_on_entered_by_membership_id"
    t.index ["evaluation_component_id", "student_id", "lesson_id", "activity_id"], name: "idx_grade_entries_component_student_ctx_kept", unique: true, where: "(discarded_at IS NULL)", nulls_not_distinct: true
    t.index ["evaluation_component_id"], name: "index_grade_entries_on_evaluation_component_id"
    t.index ["school_id"], name: "index_grade_entries_on_school_id"
    t.index ["student_id"], name: "index_grade_entries_on_student_id"
  end

  create_table "grade_launches", force: :cascade do |t|
    t.bigint "academic_period_id", null: false
    t.bigint "class_discipline_id", null: false
    t.datetime "created_at", null: false
    t.string "input_digest", null: false
    t.datetime "invalidated_at"
    t.string "invalidation_reason"
    t.datetime "launched_at", null: false
    t.bigint "launched_by_membership_id", null: false
    t.bigint "school_class_id", null: false
    t.bigint "school_id", null: false
    t.string "status", default: "launched", null: false
    t.bigint "supersedes_id"
    t.datetime "updated_at", null: false
    t.index ["academic_period_id"], name: "index_grade_launches_on_academic_period_id"
    t.index ["class_discipline_id"], name: "index_grade_launches_on_class_discipline_id"
    t.index ["launched_by_membership_id"], name: "index_grade_launches_on_launched_by_membership_id"
    t.index ["school_class_id"], name: "index_grade_launches_on_school_class_id"
    t.index ["school_id", "class_discipline_id", "academic_period_id", "input_digest"], name: "idx_grade_launches_discipline_period_digest", unique: true
    t.index ["school_id", "class_discipline_id", "academic_period_id"], name: "idx_grade_launches_current_launched", unique: true, where: "((status)::text = 'launched'::text)"
    t.index ["school_id"], name: "index_grade_launches_on_school_id"
    t.index ["supersedes_id"], name: "index_grade_launches_on_supersedes_id"
  end

  create_table "grade_overrides", force: :cascade do |t|
    t.bigint "academic_period_id", null: false
    t.bigint "applied_by_membership_id", null: false
    t.bigint "class_discipline_id", null: false
    t.string "computed_value", null: false
    t.datetime "created_at", null: false
    t.string "override_value", null: false
    t.string "reason_code", null: false
    t.bigint "school_id", null: false
    t.bigint "student_id", null: false
    t.datetime "superseded_at"
    t.bigint "supersedes_id"
    t.datetime "updated_at", null: false
    t.index ["academic_period_id"], name: "index_grade_overrides_on_academic_period_id"
    t.index ["applied_by_membership_id"], name: "index_grade_overrides_on_applied_by_membership_id"
    t.index ["class_discipline_id"], name: "index_grade_overrides_on_class_discipline_id"
    t.index ["school_id", "student_id", "class_discipline_id", "academic_period_id"], name: "index_grade_overrides_current_per_result", unique: true, where: "(superseded_at IS NULL)"
    t.index ["school_id"], name: "index_grade_overrides_on_school_id"
    t.index ["student_id"], name: "index_grade_overrides_on_student_id"
    t.index ["supersedes_id"], name: "index_grade_overrides_on_supersedes_id"
  end

  create_table "grade_scales", force: :cascade do |t|
    t.jsonb "configuration", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "name", null: false
    t.string "scale_type", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.integer "version", null: false
    t.index ["school_id", "name", "version"], name: "index_grade_scales_on_school_name_version_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_id"], name: "index_grade_scales_on_school_id"
  end

  create_table "grades", force: :cascade do |t|
    t.bigint "academic_period_id", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.text "note"
    t.bigint "recorded_by_id"
    t.bigint "school_class_id", null: false
    t.bigint "school_id", null: false
    t.decimal "score", precision: 5, scale: 2
    t.bigint "student_id", null: false
    t.bigint "subject_id", null: false
    t.datetime "updated_at", null: false
    t.index ["academic_period_id"], name: "index_grades_on_academic_period_id"
    t.index ["recorded_by_id"], name: "index_grades_on_recorded_by_id"
    t.index ["school_class_id"], name: "index_grades_on_school_class_id"
    t.index ["school_id"], name: "index_grades_on_school_id"
    t.index ["student_id", "subject_id", "academic_period_id"], name: "index_grades_on_student_subject_period_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["student_id"], name: "index_grades_on_student_id"
    t.index ["subject_id"], name: "index_grades_on_subject_id"
    t.check_constraint "score IS NULL OR score >= 0::numeric AND score <= 10::numeric", name: "grades_score_range"
  end

  create_table "guardian_requests", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "details"
    t.datetime "discarded_at"
    t.bigint "guardian_id", null: false
    t.string "kind", null: false
    t.date "reference_date"
    t.bigint "requested_by_id"
    t.text "resolution_note"
    t.datetime "resolved_at"
    t.bigint "resolved_by_id"
    t.bigint "school_id", null: false
    t.string "status", default: "pending", null: false
    t.bigint "student_id", null: false
    t.bigint "subject_id"
    t.datetime "updated_at", null: false
    t.index ["guardian_id", "created_at"], name: "index_guardian_requests_on_guardian_id_and_created_at"
    t.index ["guardian_id"], name: "index_guardian_requests_on_guardian_id"
    t.index ["requested_by_id"], name: "index_guardian_requests_on_requested_by_id"
    t.index ["resolved_by_id"], name: "index_guardian_requests_on_resolved_by_id"
    t.index ["school_id", "status", "created_at"], name: "index_guardian_requests_on_school_id_and_status_and_created_at"
    t.index ["school_id"], name: "index_guardian_requests_on_school_id"
    t.index ["student_id"], name: "index_guardian_requests_on_student_id"
    t.index ["subject_id"], name: "index_guardian_requests_on_subject_id"
    t.check_constraint "kind::text = ANY (ARRAY['declaration'::character varying, 'second_call'::character varying]::text[])", name: "guardian_requests_kind"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'in_progress'::character varying, 'fulfilled'::character varying, 'rejected'::character varying]::text[])", name: "guardian_requests_status"
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

  create_table "job_positions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "name", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_job_positions_on_discarded_by_id"
    t.index ["school_id", "name"], name: "index_job_positions_on_school_id_and_name_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_id"], name: "index_job_positions_on_school_id"
  end

  create_table "membership_invite_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "created_by_id"
    t.datetime "expires_at", null: false
    t.bigint "membership_id", null: false
    t.bigint "school_id", null: false
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.datetime "used_at"
    t.index ["created_by_id"], name: "index_membership_invite_tokens_on_created_by_id"
    t.index ["membership_id"], name: "index_membership_invite_tokens_on_membership_id"
    t.index ["membership_id"], name: "index_membership_invite_tokens_on_membership_id_unused", unique: true, where: "(used_at IS NULL)"
    t.index ["school_id", "expires_at"], name: "index_membership_invite_tokens_on_school_id_and_expires_at"
    t.index ["school_id"], name: "index_membership_invite_tokens_on_school_id"
    t.index ["token_digest"], name: "index_membership_invite_tokens_on_token_digest", unique: true
  end

  create_table "membership_permissions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "effect", default: "grant", null: false
    t.bigint "membership_id", null: false
    t.string "permission_key", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["membership_id", "permission_key"], name: "index_membership_permissions_on_membership_and_key_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["membership_id"], name: "index_membership_permissions_on_membership_id"
    t.index ["school_id", "permission_key"], name: "index_membership_permissions_on_school_id_and_permission_key"
    t.index ["school_id"], name: "index_membership_permissions_on_school_id"
  end

  create_table "memberships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.jsonb "platform_permissions", default: [], null: false
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

  create_table "plan_discounts", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "name", null: false
    t.decimal "percent", precision: 5, scale: 2, null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_plan_discounts_on_discarded_by_id"
    t.index ["school_id", "name"], name: "index_plan_discounts_on_school_id_and_name_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_id"], name: "index_plan_discounts_on_school_id"
    t.check_constraint "percent >= 0::numeric AND percent <= 100::numeric", name: "plan_discounts_percent_range"
  end

  create_table "preceptorship_reports", force: :cascade do |t|
    t.bigint "academic_period_id"
    t.bigint "author_id"
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.datetime "published_at"
    t.bigint "school_id", null: false
    t.string "status", default: "draft", null: false
    t.bigint "student_id", null: false
    t.bigint "teacher_id", null: false
    t.datetime "updated_at", null: false
    t.index ["academic_period_id"], name: "index_preceptorship_reports_on_academic_period_id"
    t.index ["author_id"], name: "index_preceptorship_reports_on_author_id"
    t.index ["school_id", "status"], name: "index_preceptorship_reports_on_school_id_and_status"
    t.index ["school_id", "student_id", "created_at"], name: "idx_on_school_id_student_id_created_at_f6ae2f9c6a"
    t.index ["school_id"], name: "index_preceptorship_reports_on_school_id"
    t.index ["student_id"], name: "index_preceptorship_reports_on_student_id"
    t.index ["teacher_id"], name: "index_preceptorship_reports_on_teacher_id"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying]::text[])", name: "preceptorship_reports_status"
  end

  create_table "provisioning_imports", force: :cascade do |t|
    t.datetime "committed_at"
    t.datetime "created_at", null: false
    t.jsonb "error_report"
    t.integer "row_count"
    t.bigint "school_id", null: false
    t.string "status", default: "previewed", null: false
    t.datetime "updated_at", null: false
    t.bigint "uploaded_by_id", null: false
    t.index ["school_id", "created_at"], name: "index_provisioning_imports_on_school_id_and_created_at"
    t.index ["school_id"], name: "index_provisioning_imports_on_school_id"
    t.index ["uploaded_by_id"], name: "index_provisioning_imports_on_uploaded_by_id"
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

  create_table "report_card_configs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "created_by_membership_id", null: false
    t.jsonb "display_config", default: {}, null: false
    t.bigint "document_signatory_id", null: false
    t.text "footer_text"
    t.text "header_text"
    t.bigint "school_id", null: false
    t.string "template_key", null: false
    t.datetime "updated_at", null: false
    t.integer "version", null: false
    t.index ["created_by_membership_id"], name: "index_report_card_configs_on_created_by_membership_id"
    t.index ["document_signatory_id"], name: "index_report_card_configs_on_document_signatory_id"
    t.index ["school_id", "version"], name: "index_report_card_configs_on_school_id_and_version", unique: true
    t.index ["school_id"], name: "index_report_card_configs_on_school_id"
  end

  create_table "report_card_publications", force: :cascade do |t|
    t.bigint "academic_period_id", null: false
    t.bigint "active_snapshot_id"
    t.datetime "created_at", null: false
    t.bigint "created_by_membership_id", null: false
    t.bigint "school_id", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["academic_period_id"], name: "index_report_card_publications_on_academic_period_id"
    t.index ["created_by_membership_id"], name: "index_report_card_publications_on_created_by_membership_id"
    t.index ["school_id", "student_id", "academic_period_id"], name: "index_rc_publications_on_school_student_period", unique: true
    t.index ["school_id"], name: "index_report_card_publications_on_school_id"
    t.index ["student_id"], name: "index_report_card_publications_on_student_id"
  end

  create_table "report_card_publish_batches", force: :cascade do |t|
    t.bigint "academic_period_id", null: false
    t.jsonb "blockers", default: [], null: false
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.integer "failed_count", default: 0, null: false
    t.text "force_publish_reason"
    t.string "mode", null: false
    t.integer "released_count", default: 0, null: false
    t.bigint "requested_by_membership_id", null: false
    t.integer "requested_count", default: 0, null: false
    t.bigint "school_class_id", null: false
    t.bigint "school_id", null: false
    t.string "status", default: "processing", null: false
    t.datetime "updated_at", null: false
    t.index ["academic_period_id"], name: "index_report_card_publish_batches_on_academic_period_id"
    t.index ["requested_by_membership_id"], name: "idx_on_requested_by_membership_id_49306825ce"
    t.index ["school_class_id"], name: "index_report_card_publish_batches_on_school_class_id"
    t.index ["school_id", "school_class_id", "academic_period_id", "status"], name: "index_rc_batches_on_school_class_period_status"
    t.index ["school_id"], name: "index_report_card_publish_batches_on_school_id"
  end

  create_table "report_card_publish_schedules", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "executed_at"
    t.string "queue_job_reference"
    t.bigint "report_card_publish_batch_id", null: false
    t.datetime "scheduled_for", null: false
    t.bigint "school_id", null: false
    t.string "school_timezone", null: false
    t.string "status", default: "scheduled", null: false
    t.datetime "updated_at", null: false
    t.index ["report_card_publish_batch_id"], name: "idx_on_report_card_publish_batch_id_4f3ab08554", unique: true
    t.index ["school_id"], name: "index_report_card_publish_schedules_on_school_id"
  end

  create_table "report_card_snapshots", force: :cascade do |t|
    t.text "correction_reason"
    t.datetime "created_at", null: false
    t.string "grade_launch_digest", null: false
    t.string "pdf_storage_key", null: false
    t.datetime "released_at", null: false
    t.bigint "report_card_config_id", null: false
    t.bigint "report_card_publication_id", null: false
    t.bigint "report_card_publish_batch_id"
    t.bigint "school_id", null: false
    t.jsonb "snapshot", null: false
    t.bigint "supersedes_id"
    t.datetime "updated_at", null: false
    t.integer "version", null: false
    t.index ["report_card_config_id"], name: "index_report_card_snapshots_on_report_card_config_id"
    t.index ["report_card_publication_id", "version"], name: "index_rc_snapshots_on_publication_version", unique: true
    t.index ["report_card_publication_id"], name: "index_report_card_snapshots_on_report_card_publication_id"
    t.index ["report_card_publish_batch_id"], name: "index_report_card_snapshots_on_report_card_publish_batch_id"
    t.index ["school_id"], name: "index_report_card_snapshots_on_school_id"
  end

  create_table "role_template_permissions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "permission_key", null: false
    t.bigint "role_template_id", null: false
    t.bigint "school_id", null: false
    t.string "scope_kind", default: "full", null: false
    t.datetime "updated_at", null: false
    t.index ["role_template_id", "permission_key"], name: "index_role_template_permissions_on_template_and_key_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["role_template_id"], name: "index_role_template_permissions_on_role_template_id"
    t.index ["school_id", "permission_key"], name: "idx_on_school_id_permission_key_29b8f16cf5"
    t.index ["school_id"], name: "index_role_template_permissions_on_school_id"
  end

  create_table "school_billing_settings", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "early_payment_discount_day"
    t.decimal "early_payment_discount_percent", precision: 5, scale: 2
    t.integer "fine_amount_cents"
    t.decimal "fine_rate_percent", precision: 5, scale: 2
    t.string "fine_type"
    t.decimal "interest_rate_percent", precision: 5, scale: 2
    t.jsonb "notification_schedule", default: {}, null: false
    t.integer "overdue_grace_days", default: 3, null: false
    t.bigint "school_id", null: false
    t.string "service_description", limit: 100
    t.datetime "updated_at", null: false
    t.index ["school_id"], name: "index_school_billing_settings_on_school_id", unique: true
    t.check_constraint "(early_payment_discount_percent IS NULL) = (early_payment_discount_day IS NULL)", name: "school_billing_settings_early_payment_discount_pair"
    t.check_constraint "early_payment_discount_day IS NULL OR early_payment_discount_day >= 1 AND early_payment_discount_day <= 28", name: "school_billing_settings_early_payment_discount_day_range"
    t.check_constraint "early_payment_discount_percent IS NULL OR early_payment_discount_percent > 0::numeric AND early_payment_discount_percent <= 100::numeric", name: "school_billing_settings_early_payment_discount_percent_range"
    t.check_constraint "fine_type IS NOT NULL OR fine_rate_percent IS NULL AND fine_amount_cents IS NULL", name: "school_billing_settings_fine_off_requires_null_values"
    t.check_constraint "fine_type IS NULL OR (fine_type::text = ANY (ARRAY['percent'::character varying, 'fixed'::character varying]::text[]))", name: "school_billing_settings_fine_type_allowed"
    t.check_constraint "fine_type IS NULL OR fine_type::text <> 'fixed'::text OR fine_amount_cents > 0 AND fine_rate_percent IS NULL", name: "school_billing_settings_fine_fixed_shape"
    t.check_constraint "fine_type IS NULL OR fine_type::text <> 'percent'::text OR fine_rate_percent > 0::numeric AND fine_rate_percent <= 100::numeric AND fine_amount_cents IS NULL", name: "school_billing_settings_fine_percent_shape"
    t.check_constraint "interest_rate_percent IS NULL OR interest_rate_percent > 0::numeric AND interest_rate_percent <= 100::numeric", name: "school_billing_settings_interest_rate_percent_range"
    t.check_constraint "overdue_grace_days >= 0 AND overdue_grace_days <= 30", name: "school_billing_settings_overdue_grace_days_range"
  end

  create_table "school_classes", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "grade_level", null: false
    t.string "name", default: "A", null: false
    t.bigint "school_id", null: false
    t.string "shift", default: "matutino", null: false
    t.datetime "updated_at", null: false
    t.integer "year", null: false
    t.index "school_id, year, grade_level, shift, lower((name)::text)", name: "index_school_classes_on_school_year_grade_shift_name_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["discarded_by_id"], name: "index_school_classes_on_discarded_by_id"
    t.index ["school_id"], name: "index_school_classes_on_school_id"
    t.check_constraint "shift::text = ANY (ARRAY['matutino'::character varying, 'vespertino'::character varying]::text[])", name: "school_classes_shift_allowed"
  end

  create_table "school_fiscal_settings", force: :cascade do |t|
    t.string "city_service_code"
    t.string "cnae_code"
    t.datetime "created_at", null: false
    t.boolean "enabled", default: false, null: false
    t.string "federal_service_code"
    t.jsonb "ibs_cbs_config", default: {}, null: false
    t.decimal "iss_rate_percent", precision: 5, scale: 2
    t.string "issuance_city_name", null: false
    t.string "issuance_state", limit: 2, null: false
    t.string "issue_type"
    t.string "national_taxation_code"
    t.string "nbs_code"
    t.jsonb "provider_options_snapshot", default: {}, null: false
    t.boolean "reform_tributaria_enabled", default: false, null: false
    t.bigint "school_id", null: false
    t.string "service_description", limit: 100
    t.integer "spedy_city_code", null: false
    t.string "tax_location", default: "companyMunicipality", null: false
    t.string "taxation_type", default: "taxationInMunicipality", null: false
    t.datetime "updated_at", null: false
    t.index ["school_id"], name: "index_school_fiscal_settings_on_school_id", unique: true
  end

  create_table "school_groups", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "headquarters_cnpj"
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "school_holidays", force: :cascade do |t|
    t.boolean "applies_to_attendance", default: true, null: false
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.datetime "discarded_at"
    t.string "name", null: false
    t.bigint "school_id", null: false
    t.bigint "school_year_id", null: false
    t.datetime "updated_at", null: false
    t.index ["school_id"], name: "index_school_holidays_on_school_id"
    t.index ["school_year_id", "date"], name: "index_school_holidays_on_year_date_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_year_id"], name: "index_school_holidays_on_school_year_id"
  end

  create_table "school_modules", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "enabled", default: true, null: false
    t.string "module_key", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["school_id", "module_key"], name: "index_school_modules_on_school_id_and_module_key", unique: true
    t.index ["school_id"], name: "index_school_modules_on_school_id"
  end

  create_table "school_payment_providers", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.text "api_key"
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
    t.check_constraint "instrument::text = ANY (ARRAY['bank_slip'::text, 'service_invoice'::text])", name: "school_payment_providers_instrument_allowed"
  end

  create_table "school_role_templates", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.boolean "is_system", default: false, null: false
    t.string "name", null: false
    t.bigint "school_id", null: false
    t.string "system_key"
    t.datetime "updated_at", null: false
    t.index ["school_id", "system_key"], name: "index_school_role_templates_on_school_id_and_system_key_kept", unique: true, where: "((system_key IS NOT NULL) AND (discarded_at IS NULL))"
    t.index ["school_id"], name: "index_school_role_templates_on_school_id"
  end

  create_table "school_signature_providers", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.text "api_token"
    t.datetime "created_at", null: false
    t.string "provider", null: false
    t.bigint "school_id", null: false
    t.jsonb "settings", default: {}, null: false
    t.datetime "updated_at", null: false
    t.datetime "uploaded_at"
    t.bigint "uploaded_by_id"
    t.string "webhook_endpoint_token", null: false
    t.text "webhook_secret"
    t.index ["school_id"], name: "index_school_signature_providers_active_school", unique: true, where: "(active = true)"
    t.index ["school_id"], name: "index_school_signature_providers_on_school_id"
    t.index ["uploaded_by_id"], name: "index_school_signature_providers_on_uploaded_by_id"
    t.index ["webhook_endpoint_token"], name: "index_school_signature_providers_on_webhook_token", unique: true
    t.check_constraint "provider::text = ANY (ARRAY['autentique'::character varying, 'fake'::character varying]::text[])", name: "school_signature_providers_provider_allowed"
  end

  create_table "school_transactions", force: :cascade do |t|
    t.integer "amount_cents", null: false
    t.string "category", null: false
    t.datetime "created_at", null: false
    t.string "description"
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "kind", null: false
    t.date "occurred_on", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_school_transactions_on_discarded_by_id"
    t.index ["school_id", "kind"], name: "index_school_transactions_on_school_id_and_kind"
    t.index ["school_id", "occurred_on"], name: "index_school_transactions_on_school_id_and_occurred_on"
    t.index ["school_id"], name: "index_school_transactions_on_school_id"
    t.check_constraint "amount_cents >= 0", name: "school_transactions_amount_cents_non_negative"
    t.check_constraint "kind::text = ANY (ARRAY['income'::character varying, 'expense'::character varying]::text[])", name: "school_transactions_kind_allowed"
  end

  create_table "school_years", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.date "ends_on", null: false
    t.string "name", null: false
    t.string "period_template", default: "trimester", null: false
    t.bigint "school_id", null: false
    t.date "starts_on", null: false
    t.string "status", default: "draft", null: false
    t.datetime "updated_at", null: false
    t.index ["school_id", "status"], name: "index_school_years_on_school_id_and_status"
    t.index ["school_id"], name: "index_school_years_on_school_id"
    t.index ["school_id"], name: "index_school_years_one_active_per_school_kept", unique: true, where: "(((status)::text = 'active'::text) AND (discarded_at IS NULL))"
    t.check_constraint "ends_on >= starts_on", name: "school_years_dates_valid"
  end

  create_table "schools", force: :cascade do |t|
    t.string "address"
    t.datetime "billing_waived_at"
    t.string "cnpj"
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "name"
    t.string "onboarding_mode", default: "self_serve", null: false
    t.string "onboarding_status", default: "pending_handoff", null: false
    t.string "saas_plan"
    t.bigint "school_group_id"
    t.datetime "segments_skipped_at"
    t.string "signature_email"
    t.datetime "updated_at", null: false
    t.index ["discarded_by_id"], name: "index_schools_on_discarded_by_id"
    t.index ["school_group_id"], name: "index_schools_on_school_group_id"
  end

  create_table "segments", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "name", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["school_id", "name"], name: "index_segments_on_school_id_and_name_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["school_id"], name: "index_segments_on_school_id"
  end

  create_table "service_invoice_attempts", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "enqueued_at"
    t.datetime "failed_at"
    t.string "idempotency_key", null: false
    t.text "last_error"
    t.string "provider", null: false
    t.jsonb "provider_response"
    t.bigint "school_id", null: false
    t.bigint "service_invoice_id", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["idempotency_key"], name: "index_service_invoice_attempts_on_idempotency_key", unique: true
    t.index ["school_id"], name: "index_service_invoice_attempts_on_school_id"
    t.index ["service_invoice_id"], name: "index_service_invoice_attempts_on_service_invoice_id"
  end

  create_table "service_invoices", force: :cascade do |t|
    t.string "access_key"
    t.datetime "authorized_at"
    t.datetime "canceled_at"
    t.bigint "charge_id", null: false
    t.datetime "created_at", null: false
    t.datetime "enqueued_at"
    t.datetime "failed_at"
    t.string "integration_id", null: false
    t.string "invoice_number"
    t.text "last_error"
    t.bigint "payment_id", null: false
    t.string "pdf_blob_key"
    t.string "provider", null: false
    t.string "provider_document_id"
    t.datetime "rejected_at"
    t.bigint "school_id", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.string "verification_code"
    t.string "xml_blob_key"
    t.index ["charge_id"], name: "index_service_invoices_on_charge_id"
    t.index ["integration_id"], name: "index_service_invoices_on_integration_id", unique: true
    t.index ["payment_id"], name: "index_service_invoices_on_payment_id", unique: true
    t.index ["provider_document_id"], name: "index_service_invoices_on_provider_document_id", unique: true, where: "(provider_document_id IS NOT NULL)"
    t.index ["school_id", "status"], name: "index_service_invoices_on_school_id_and_status"
    t.index ["school_id"], name: "index_service_invoices_on_school_id"
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

  create_table "staff_profiles", force: :cascade do |t|
    t.boolean "also_teaches", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "display_title"
    t.boolean "is_owner", default: false, null: false
    t.bigint "membership_id", null: false
    t.bigint "role_template_id", null: false
    t.bigint "school_id", null: false
    t.bigint "segment_id"
    t.datetime "updated_at", null: false
    t.index ["membership_id"], name: "index_staff_profiles_on_membership_id"
    t.index ["membership_id"], name: "index_staff_profiles_on_membership_id_kept", unique: true, where: "(discarded_at IS NULL)"
    t.index ["role_template_id"], name: "index_staff_profiles_on_role_template_id"
    t.index ["school_id"], name: "index_staff_profiles_on_school_id"
    t.index ["school_id"], name: "index_staff_profiles_on_school_id_owner_kept", unique: true, where: "((is_owner = true) AND (discarded_at IS NULL))"
    t.index ["segment_id"], name: "index_staff_profiles_on_segment_id"
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

  create_table "student_health_records", force: :cascade do |t|
    t.text "content", default: "", null: false
    t.datetime "content_updated_at"
    t.datetime "created_at", null: false
    t.bigint "school_id", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "updated_by_id"
    t.index ["school_id"], name: "index_student_health_records_on_school_id"
    t.index ["student_id"], name: "index_student_health_records_on_student", unique: true
    t.index ["student_id"], name: "index_student_health_records_on_student_id"
    t.index ["updated_by_id"], name: "index_student_health_records_on_updated_by_id"
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

  create_table "tax_declaration_access_events", force: :cascade do |t|
    t.bigint "actor_user_id", null: false
    t.datetime "created_at", null: false
    t.string "event_type", default: "pdf_download", null: false
    t.bigint "guardian_id", null: false
    t.datetime "occurred_at", null: false
    t.string "request_uuid", null: false
    t.bigint "school_id", null: false
    t.bigint "tax_declaration_id", null: false
    t.bigint "tax_declaration_version_id", null: false
    t.datetime "updated_at", null: false
    t.index ["actor_user_id"], name: "index_tax_declaration_access_events_on_actor_user_id"
    t.index ["guardian_id"], name: "index_tax_declaration_access_events_on_guardian_id"
    t.index ["request_uuid"], name: "index_tax_declaration_access_events_on_request_uuid", unique: true
    t.index ["school_id", "guardian_id", "occurred_at"], name: "index_tax_declaration_access_events_on_school_guardian_time"
    t.index ["school_id"], name: "index_tax_declaration_access_events_on_school_id"
    t.index ["tax_declaration_id"], name: "index_tax_declaration_access_events_on_tax_declaration_id"
    t.index ["tax_declaration_version_id", "occurred_at"], name: "index_tax_declaration_access_events_on_version_time"
    t.index ["tax_declaration_version_id"], name: "idx_on_tax_declaration_version_id_a539fe4cad"
  end

  create_table "tax_declaration_items", force: :cascade do |t|
    t.string "billing_purpose_code", null: false
    t.bigint "charge_id", null: false
    t.datetime "created_at", null: false
    t.integer "declared_principal_amount_cents", null: false
    t.datetime "paid_at", null: false
    t.bigint "payment_id", null: false
    t.bigint "school_id", null: false
    t.integer "source_fine_amount_cents", default: 0, null: false
    t.integer "source_interest_amount_cents", default: 0, null: false
    t.integer "source_paid_amount_cents", null: false
    t.bigint "student_id", null: false
    t.bigint "tax_declaration_version_id", null: false
    t.datetime "updated_at", null: false
    t.index ["charge_id"], name: "index_tax_declaration_items_on_charge_id"
    t.index ["payment_id"], name: "index_tax_declaration_items_on_payment_id"
    t.index ["school_id"], name: "index_tax_declaration_items_on_school_id"
    t.index ["student_id"], name: "index_tax_declaration_items_on_student_id"
    t.index ["tax_declaration_version_id", "payment_id"], name: "index_tax_declaration_items_on_version_payment", unique: true
    t.index ["tax_declaration_version_id", "student_id"], name: "index_tax_declaration_items_on_version_student"
    t.index ["tax_declaration_version_id"], name: "index_tax_declaration_items_on_tax_declaration_version_id"
    t.check_constraint "declared_principal_amount_cents >= 0", name: "tax_declaration_items_declared_principal_non_negative"
    t.check_constraint "source_fine_amount_cents >= 0", name: "tax_declaration_items_fine_non_negative"
    t.check_constraint "source_interest_amount_cents >= 0", name: "tax_declaration_items_interest_non_negative"
  end

  create_table "tax_declaration_settings", force: :cascade do |t|
    t.bigint "approved_by_id"
    t.string "approved_purpose_configuration_digest"
    t.integer "configuration_version", default: 1, null: false
    t.datetime "created_at", null: false
    t.bigint "document_signatory_id"
    t.datetime "legal_accounting_approved_at"
    t.text "legal_text"
    t.string "legal_text_version"
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["approved_by_id"], name: "index_tax_declaration_settings_on_approved_by_id"
    t.index ["document_signatory_id"], name: "index_tax_declaration_settings_on_document_signatory_id"
    t.index ["school_id"], name: "index_tax_declaration_settings_on_school_id", unique: true
  end

  create_table "tax_declaration_versions", force: :cascade do |t|
    t.jsonb "approval_snapshot", default: {}, null: false
    t.string "calculation_digest", null: false
    t.jsonb "calculation_snapshot", default: {}, null: false
    t.datetime "created_at", null: false
    t.jsonb "document_signatory_snapshot", default: {}, null: false
    t.datetime "issued_at", null: false
    t.text "legal_text_snapshot", null: false
    t.string "legal_text_version_snapshot", null: false
    t.jsonb "payer_identity_snapshot", default: {}, null: false
    t.string "pdf_storage_key", null: false
    t.jsonb "purpose_configuration_snapshot", default: {}, null: false
    t.bigint "school_id", null: false
    t.jsonb "school_identity_snapshot", default: {}, null: false
    t.integer "settings_version", null: false
    t.bigint "supersedes_id"
    t.bigint "tax_declaration_id", null: false
    t.integer "total_declared_principal_amount_cents", null: false
    t.datetime "updated_at", null: false
    t.string "verification_code", null: false
    t.integer "version", null: false
    t.index ["school_id"], name: "index_tax_declaration_versions_on_school_id"
    t.index ["tax_declaration_id", "calculation_digest"], name: "index_tax_declaration_versions_on_declaration_digest", unique: true
    t.index ["tax_declaration_id", "version"], name: "index_tax_declaration_versions_on_declaration_version", unique: true
    t.index ["tax_declaration_id"], name: "index_tax_declaration_versions_on_tax_declaration_id"
    t.index ["verification_code"], name: "index_tax_declaration_versions_on_verification_code", unique: true
  end

  create_table "tax_declarations", force: :cascade do |t|
    t.bigint "active_version_id"
    t.integer "calendar_year", null: false
    t.datetime "created_at", null: false
    t.bigint "guardian_id", null: false
    t.bigint "school_id", null: false
    t.datetime "updated_at", null: false
    t.index ["guardian_id"], name: "index_tax_declarations_on_guardian_id"
    t.index ["school_id", "guardian_id", "calendar_year"], name: "index_tax_declarations_on_school_guardian_year", unique: true
    t.index ["school_id"], name: "index_tax_declarations_on_school_id"
  end

  create_table "teacher_bank_accounts", force: :cascade do |t|
    t.text "account_number"
    t.string "agency"
    t.string "bank_name"
    t.datetime "created_at", null: false
    t.text "pix_key"
    t.bigint "school_id", null: false
    t.bigint "teacher_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "updated_by_id"
    t.index ["school_id"], name: "index_teacher_bank_accounts_on_school_id"
    t.index ["teacher_id"], name: "index_teacher_bank_accounts_on_teacher", unique: true
    t.index ["teacher_id"], name: "index_teacher_bank_accounts_on_teacher_id"
    t.index ["updated_by_id"], name: "index_teacher_bank_accounts_on_updated_by_id"
  end

  create_table "teachers", force: :cascade do |t|
    t.string "city"
    t.string "complement"
    t.string "cpf", limit: 11
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.bigint "discarded_by_id"
    t.string "email"
    t.date "hired_on"
    t.bigint "job_position_id"
    t.string "name", null: false
    t.string "neighborhood"
    t.string "number"
    t.string "phone"
    t.bigint "school_id", null: false
    t.string "state", limit: 2
    t.string "street"
    t.datetime "updated_at", null: false
    t.string "zip_code", limit: 8
    t.index ["discarded_by_id"], name: "index_teachers_on_discarded_by_id"
    t.index ["job_position_id"], name: "index_teachers_on_job_position_id"
    t.index ["school_id", "cpf"], name: "index_teachers_on_school_id_and_cpf_kept", unique: true, where: "((discarded_at IS NULL) AND (cpf IS NOT NULL))"
    t.index ["school_id"], name: "index_teachers_on_school_id"
    t.check_constraint "cpf IS NULL OR cpf::text ~ '^[0-9]{11}$'::text", name: "teachers_cpf_format"
    t.check_constraint "state IS NULL OR state::text ~ '^[A-Z]{2}$'::text", name: "teachers_state_format"
    t.check_constraint "zip_code IS NULL OR zip_code::text ~ '^[0-9]{8}$'::text", name: "teachers_zip_code_format"
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

  add_foreign_key "academic_periods", "school_years"
  add_foreign_key "academic_periods", "schools"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "applied_discounts", "charges"
  add_foreign_key "applied_discounts", "schools"
  add_foreign_key "attendance_policies", "schools"
  add_foreign_key "attendance_records", "attendance_sessions"
  add_foreign_key "attendance_records", "schools"
  add_foreign_key "attendance_records", "students"
  add_foreign_key "attendance_sessions", "academic_periods"
  add_foreign_key "attendance_sessions", "memberships", column: "recorded_by_membership_id"
  add_foreign_key "attendance_sessions", "school_classes"
  add_foreign_key "attendance_sessions", "school_years"
  add_foreign_key "attendance_sessions", "schools"
  add_foreign_key "authorized_pickups", "schools"
  add_foreign_key "authorized_pickups", "students"
  add_foreign_key "authorized_pickups", "users", column: "created_by_id"
  add_foreign_key "billing_plans", "schools"
  add_foreign_key "billing_purposes", "schools"
  add_foreign_key "charge_issuances", "charges"
  add_foreign_key "charge_issuances", "schools"
  add_foreign_key "charges", "billing_purposes"
  add_foreign_key "charges", "contracts"
  add_foreign_key "charges", "guardians"
  add_foreign_key "charges", "schools"
  add_foreign_key "charges", "users", column: "discarded_by_id"
  add_foreign_key "class_disciplines", "school_classes"
  add_foreign_key "class_disciplines", "school_years"
  add_foreign_key "class_disciplines", "schools"
  add_foreign_key "class_disciplines", "subjects"
  add_foreign_key "class_disciplines", "teachers"
  add_foreign_key "collection_reminder_deliveries", "charges"
  add_foreign_key "collection_reminder_deliveries", "schools"
  add_foreign_key "contract_templates", "schools"
  add_foreign_key "contract_templates", "users", column: "updated_by_id"
  add_foreign_key "contracts", "billing_plans"
  add_foreign_key "contracts", "guardians", column: "payer_guardian_id"
  add_foreign_key "contracts", "plan_discounts"
  add_foreign_key "contracts", "schools"
  add_foreign_key "contracts", "students"
  add_foreign_key "device_tokens", "users"
  add_foreign_key "document_signatories", "schools"
  add_foreign_key "documents", "schools"
  add_foreign_key "documents", "users", column: "discarded_by_id"
  add_foreign_key "documents", "users", column: "uploaded_by_id"
  add_foreign_key "evaluation_components", "class_disciplines"
  add_foreign_key "evaluation_components", "evaluation_templates"
  add_foreign_key "evaluation_components", "grade_scales"
  add_foreign_key "evaluation_components", "schools"
  add_foreign_key "evaluation_templates", "academic_periods"
  add_foreign_key "evaluation_templates", "evaluation_templates", column: "supersedes_id"
  add_foreign_key "evaluation_templates", "memberships", column: "created_by_membership_id"
  add_foreign_key "evaluation_templates", "school_classes"
  add_foreign_key "evaluation_templates", "schools"
  add_foreign_key "grade_entries", "academic_periods"
  add_foreign_key "grade_entries", "class_disciplines"
  add_foreign_key "grade_entries", "evaluation_components"
  add_foreign_key "grade_entries", "memberships", column: "entered_by_membership_id"
  add_foreign_key "grade_entries", "schools"
  add_foreign_key "grade_entries", "students"
  add_foreign_key "grade_launches", "academic_periods"
  add_foreign_key "grade_launches", "class_disciplines"
  add_foreign_key "grade_launches", "grade_launches", column: "supersedes_id"
  add_foreign_key "grade_launches", "memberships", column: "launched_by_membership_id"
  add_foreign_key "grade_launches", "school_classes"
  add_foreign_key "grade_launches", "schools"
  add_foreign_key "grade_overrides", "academic_periods"
  add_foreign_key "grade_overrides", "class_disciplines"
  add_foreign_key "grade_overrides", "grade_overrides", column: "supersedes_id"
  add_foreign_key "grade_overrides", "memberships", column: "applied_by_membership_id"
  add_foreign_key "grade_overrides", "schools"
  add_foreign_key "grade_overrides", "students"
  add_foreign_key "grade_scales", "schools"
  add_foreign_key "grades", "academic_periods"
  add_foreign_key "grades", "school_classes"
  add_foreign_key "grades", "schools"
  add_foreign_key "grades", "students"
  add_foreign_key "grades", "subjects"
  add_foreign_key "grades", "users", column: "recorded_by_id"
  add_foreign_key "guardian_requests", "guardians"
  add_foreign_key "guardian_requests", "schools"
  add_foreign_key "guardian_requests", "students"
  add_foreign_key "guardian_requests", "subjects"
  add_foreign_key "guardian_requests", "users", column: "requested_by_id"
  add_foreign_key "guardian_requests", "users", column: "resolved_by_id"
  add_foreign_key "guardians", "schools"
  add_foreign_key "guardians", "users"
  add_foreign_key "guardians", "users", column: "discarded_by_id"
  add_foreign_key "job_positions", "schools"
  add_foreign_key "job_positions", "users", column: "discarded_by_id"
  add_foreign_key "membership_invite_tokens", "memberships"
  add_foreign_key "membership_invite_tokens", "schools"
  add_foreign_key "membership_invite_tokens", "users", column: "created_by_id"
  add_foreign_key "membership_permissions", "memberships"
  add_foreign_key "membership_permissions", "schools"
  add_foreign_key "memberships", "schools"
  add_foreign_key "memberships", "users"
  add_foreign_key "memberships", "users", column: "suspended_by_id"
  add_foreign_key "payments", "charges"
  add_foreign_key "payments", "schools"
  add_foreign_key "plan_discounts", "schools"
  add_foreign_key "plan_discounts", "users", column: "discarded_by_id"
  add_foreign_key "preceptorship_reports", "academic_periods"
  add_foreign_key "preceptorship_reports", "schools"
  add_foreign_key "preceptorship_reports", "students"
  add_foreign_key "preceptorship_reports", "teachers"
  add_foreign_key "preceptorship_reports", "users", column: "author_id"
  add_foreign_key "provisioning_imports", "schools"
  add_foreign_key "provisioning_imports", "users", column: "uploaded_by_id"
  add_foreign_key "refresh_tokens", "users"
  add_foreign_key "report_card_configs", "document_signatories"
  add_foreign_key "report_card_configs", "memberships", column: "created_by_membership_id"
  add_foreign_key "report_card_configs", "schools"
  add_foreign_key "report_card_publications", "academic_periods"
  add_foreign_key "report_card_publications", "memberships", column: "created_by_membership_id"
  add_foreign_key "report_card_publications", "report_card_snapshots", column: "active_snapshot_id"
  add_foreign_key "report_card_publications", "schools"
  add_foreign_key "report_card_publications", "students"
  add_foreign_key "report_card_publish_batches", "academic_periods"
  add_foreign_key "report_card_publish_batches", "memberships", column: "requested_by_membership_id"
  add_foreign_key "report_card_publish_batches", "school_classes"
  add_foreign_key "report_card_publish_batches", "schools"
  add_foreign_key "report_card_publish_schedules", "report_card_publish_batches"
  add_foreign_key "report_card_publish_schedules", "schools"
  add_foreign_key "report_card_snapshots", "report_card_configs"
  add_foreign_key "report_card_snapshots", "report_card_publications"
  add_foreign_key "report_card_snapshots", "report_card_publish_batches"
  add_foreign_key "report_card_snapshots", "report_card_snapshots", column: "supersedes_id"
  add_foreign_key "report_card_snapshots", "schools"
  add_foreign_key "role_template_permissions", "school_role_templates", column: "role_template_id"
  add_foreign_key "role_template_permissions", "schools"
  add_foreign_key "school_billing_settings", "schools"
  add_foreign_key "school_classes", "schools"
  add_foreign_key "school_classes", "users", column: "discarded_by_id"
  add_foreign_key "school_fiscal_settings", "schools"
  add_foreign_key "school_holidays", "school_years"
  add_foreign_key "school_holidays", "schools"
  add_foreign_key "school_modules", "schools"
  add_foreign_key "school_payment_providers", "schools"
  add_foreign_key "school_payment_providers", "users", column: "uploaded_by_id"
  add_foreign_key "school_role_templates", "schools"
  add_foreign_key "school_signature_providers", "schools"
  add_foreign_key "school_signature_providers", "users", column: "uploaded_by_id"
  add_foreign_key "school_transactions", "schools"
  add_foreign_key "school_transactions", "users", column: "discarded_by_id"
  add_foreign_key "school_years", "schools"
  add_foreign_key "schools", "school_groups"
  add_foreign_key "schools", "users", column: "discarded_by_id"
  add_foreign_key "segments", "schools"
  add_foreign_key "service_invoice_attempts", "schools"
  add_foreign_key "service_invoice_attempts", "service_invoices"
  add_foreign_key "service_invoices", "charges"
  add_foreign_key "service_invoices", "payments"
  add_foreign_key "service_invoices", "schools"
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "staff_profiles", "memberships"
  add_foreign_key "staff_profiles", "school_role_templates", column: "role_template_id"
  add_foreign_key "staff_profiles", "schools"
  add_foreign_key "staff_profiles", "segments"
  add_foreign_key "student_guardians", "guardians"
  add_foreign_key "student_guardians", "schools"
  add_foreign_key "student_guardians", "students"
  add_foreign_key "student_health_records", "schools"
  add_foreign_key "student_health_records", "students"
  add_foreign_key "student_health_records", "users", column: "updated_by_id"
  add_foreign_key "students", "school_classes"
  add_foreign_key "students", "schools"
  add_foreign_key "students", "users", column: "discarded_by_id"
  add_foreign_key "subjects", "schools"
  add_foreign_key "subjects", "users", column: "discarded_by_id"
  add_foreign_key "tax_declaration_access_events", "guardians"
  add_foreign_key "tax_declaration_access_events", "schools"
  add_foreign_key "tax_declaration_access_events", "tax_declaration_versions"
  add_foreign_key "tax_declaration_access_events", "tax_declarations"
  add_foreign_key "tax_declaration_access_events", "users", column: "actor_user_id"
  add_foreign_key "tax_declaration_items", "charges"
  add_foreign_key "tax_declaration_items", "payments"
  add_foreign_key "tax_declaration_items", "schools"
  add_foreign_key "tax_declaration_items", "students"
  add_foreign_key "tax_declaration_items", "tax_declaration_versions"
  add_foreign_key "tax_declaration_settings", "document_signatories"
  add_foreign_key "tax_declaration_settings", "schools"
  add_foreign_key "tax_declaration_settings", "users", column: "approved_by_id"
  add_foreign_key "tax_declaration_versions", "schools"
  add_foreign_key "tax_declaration_versions", "tax_declaration_versions", column: "supersedes_id"
  add_foreign_key "tax_declaration_versions", "tax_declarations"
  add_foreign_key "tax_declarations", "guardians"
  add_foreign_key "tax_declarations", "schools"
  add_foreign_key "tax_declarations", "tax_declaration_versions", column: "active_version_id"
  add_foreign_key "teacher_bank_accounts", "schools"
  add_foreign_key "teacher_bank_accounts", "teachers"
  add_foreign_key "teacher_bank_accounts", "users", column: "updated_by_id"
  add_foreign_key "teachers", "job_positions"
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
