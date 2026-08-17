# frozen_string_literal: true

class CreateGradeEvaluationTables < ActiveRecord::Migration[8.1]
  def change
    create_table :grade_scales do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.string :scale_type, null: false
      t.integer :version, null: false
      t.jsonb :configuration, null: false, default: {}
      t.datetime :discarded_at
      t.timestamps
    end

    add_index :grade_scales,
              %i[school_id name version],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_grade_scales_on_school_name_version_kept"

    create_table :evaluation_templates do |t|
      t.references :school, null: false, foreign_key: true
      t.references :school_class, null: false, foreign_key: true
      t.references :academic_period, null: false, foreign_key: true
      t.integer :version, null: false
      t.references :supersedes, foreign_key: { to_table: :evaluation_templates }
      t.datetime :retired_at
      t.string :rounding_mode, null: false, default: "half_up"
      t.boolean :lock_on_launch, null: false, default: false
      t.references :created_by_membership, null: false, foreign_key: { to_table: :memberships }
      t.datetime :discarded_at
      t.timestamps
    end

    add_index :evaluation_templates,
              %i[school_id school_class_id academic_period_id version],
              unique: true,
              where: "discarded_at IS NULL",
              name: "idx_eval_templates_class_period_version_kept"

    add_index :evaluation_templates,
              %i[school_id school_class_id academic_period_id],
              unique: true,
              where: "retired_at IS NULL AND discarded_at IS NULL",
              name: "idx_eval_templates_current_per_class_period"

    create_table :evaluation_components do |t|
      t.references :school, null: false, foreign_key: true
      t.references :evaluation_template, null: false, foreign_key: true
      t.references :class_discipline, null: false, foreign_key: true
      t.references :grade_scale, null: false, foreign_key: true
      t.string :name, null: false
      t.decimal :weight_percent, precision: 5, scale: 2, null: false
      t.string :entry_kind, null: false, default: "regular"
      t.integer :position, null: false
      t.datetime :discarded_at
      t.timestamps
    end

    add_index :evaluation_components,
              %i[evaluation_template_id class_discipline_id position],
              unique: true,
              where: "discarded_at IS NULL",
              name: "idx_eval_components_template_disc_pos_kept"

    create_table :grade_entries do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.references :class_discipline, null: false, foreign_key: true
      t.references :academic_period, null: false, foreign_key: true
      t.references :evaluation_component, null: false, foreign_key: true
      t.bigint :lesson_id
      t.bigint :activity_id
      t.string :entry_kind, null: false, default: "regular"
      t.string :value
      t.references :entered_by_membership, foreign_key: { to_table: :memberships }
      t.datetime :discarded_at
      t.timestamps
    end

    add_index :grade_entries,
              %i[evaluation_component_id student_id lesson_id activity_id],
              unique: true,
              nulls_not_distinct: true,
              where: "discarded_at IS NULL",
              name: "idx_grade_entries_component_student_ctx_kept"

    create_table :grade_overrides do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.references :class_discipline, null: false, foreign_key: true
      t.references :academic_period, null: false, foreign_key: true
      t.string :computed_value, null: false
      t.string :override_value, null: false
      t.string :reason_code, null: false
      t.references :applied_by_membership, null: false, foreign_key: { to_table: :memberships }
      t.references :supersedes, foreign_key: { to_table: :grade_overrides }
      t.datetime :superseded_at
      t.timestamps
    end

    add_index :grade_overrides,
              %i[school_id student_id class_discipline_id academic_period_id],
              unique: true,
              where: "superseded_at IS NULL",
              name: "index_grade_overrides_current_per_result"

    create_table :grade_launches do |t|
      t.references :school, null: false, foreign_key: true
      t.references :school_class, null: false, foreign_key: true
      t.references :class_discipline, null: false, foreign_key: true
      t.references :academic_period, null: false, foreign_key: true
      t.references :launched_by_membership, null: false, foreign_key: { to_table: :memberships }
      t.references :supersedes, foreign_key: { to_table: :grade_launches }
      t.string :status, null: false, default: "launched"
      t.datetime :launched_at, null: false
      t.string :input_digest, null: false
      t.datetime :invalidated_at
      t.string :invalidation_reason
      t.timestamps
    end

    add_index :grade_launches,
              %i[school_id class_discipline_id academic_period_id input_digest],
              unique: true,
              name: "idx_grade_launches_discipline_period_digest"

    add_index :grade_launches,
              %i[school_id class_discipline_id academic_period_id],
              unique: true,
              where: "status = 'launched'",
              name: "idx_grade_launches_current_launched"
  end
end
