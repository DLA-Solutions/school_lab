# frozen_string_literal: true

class CreateIncidents < ActiveRecord::Migration[8.1]
  def change
    create_table :incidents do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.references :incident_type, null: false, foreign_key: true
      t.references :reported_by_membership, null: false, foreign_key: { to_table: :memberships }
      t.string :category, null: false
      t.string :severity
      t.string :visibility, null: false
      t.string :status, null: false, default: "pending_approval"
      t.text :description
      t.text :guardian_points_raised
      t.text :school_response
      t.datetime :published_at
      t.datetime :coordination_approved_at
      t.references :coordination_approved_by_membership, foreign_key: { to_table: :memberships }
      t.datetime :director_approved_at
      t.references :director_approved_by_membership, foreign_key: { to_table: :memberships }

      t.timestamps
    end

    add_index :incidents, %i[school_id student_id created_at]
    add_index :incidents, %i[school_id status]
  end
end
