# frozen_string_literal: true

# The post a collaborator occupies becomes a record of its own. It was a free-text column, which
# let "Professor", "professor" and "Professor(a)" stand for the same post.
class CreateJobPositions < ActiveRecord::Migration[8.1]
  def up
    create_table :job_positions do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :job_positions,
              %i[school_id name],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_job_positions_on_school_id_and_name_kept"

    add_reference :teachers, :job_position, foreign_key: true

    # Every school gets the standard set, and any post already typed into `job_title` that is not
    # in it is kept as well — a school may have invented one, and dropping it would lose data.
    School.reset_column_information
    School.find_each do |school|
      JobPosition::DEFAULT_NAMES.each do |name|
        JobPosition.create!(school_id: school.id, name: name)
      end
    end

    execute <<~SQL.squish
      INSERT INTO job_positions (school_id, name, created_at, updated_at)
      SELECT DISTINCT t.school_id, t.job_title, NOW(), NOW()
      FROM teachers t
      WHERE t.job_title IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM job_positions p
          WHERE p.school_id = t.school_id AND p.name = t.job_title AND p.discarded_at IS NULL
        )
    SQL

    execute <<~SQL.squish
      UPDATE teachers
      SET job_position_id = job_positions.id
      FROM job_positions
      WHERE teachers.job_title = job_positions.name
        AND teachers.school_id = job_positions.school_id
        AND job_positions.discarded_at IS NULL
    SQL

    remove_column :teachers, :job_title
  end

  def down
    add_column :teachers, :job_title, :string

    execute <<~SQL.squish
      UPDATE teachers
      SET job_title = job_positions.name
      FROM job_positions
      WHERE teachers.job_position_id = job_positions.id
    SQL

    remove_reference :teachers, :job_position
    drop_table :job_positions
  end
end
