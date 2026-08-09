# frozen_string_literal: true

# The register holds every collaborator, not only the ones who teach — so each row states the post
# it occupies and when the engagement started.
class AddEmploymentDetailsToTeachers < ActiveRecord::Migration[8.1]
  def up
    add_column :teachers, :job_title, :string
    add_column :teachers, :hired_on, :date

    # Every row that predates the column was a teacher, so the post is known. The hire date is
    # not: inventing one would put a fabricated employment record in the database, and the field
    # stays nullable for exactly that reason.
    execute "UPDATE teachers SET job_title = 'Professor' WHERE job_title IS NULL"
  end

  def down
    remove_column :teachers, :job_title
    remove_column :teachers, :hired_on
  end
end
