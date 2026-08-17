# frozen_string_literal: true

class CreateReportCardPublications < ActiveRecord::Migration[8.1]
  def change
    create_table :report_card_publications do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.references :academic_period, null: false, foreign_key: true
      t.bigint :active_snapshot_id
      t.references :created_by_membership, null: false, foreign_key: { to_table: :memberships }

      t.timestamps
    end

    add_index :report_card_publications,
              %i[school_id student_id academic_period_id],
              unique: true,
              name: "index_rc_publications_on_school_student_period"
  end
end
