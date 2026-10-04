# frozen_string_literal: true

class UpdateLessonPlansForStructuredTemplate < ActiveRecord::Migration[8.1]
  def change
    remove_column :lesson_plans, :content, :text, null: false

    add_column :lesson_plans, :duration, :string
    add_column :lesson_plans, :unit_stage, :string
    add_column :lesson_plans, :topic, :string
    add_column :lesson_plans, :general_objective, :text
    add_column :lesson_plans, :specific_objectives, :text
    add_column :lesson_plans, :bncc_competencies, :text
    add_column :lesson_plans, :other_competencies, :text
    add_column :lesson_plans, :resources_materials, :text
    add_column :lesson_plans, :assessment_types, :string, array: true, default: []
    add_column :lesson_plans, :assessment_formats, :string, array: true, default: []
  end
end
