# frozen_string_literal: true

# Something a guardian asks the school for: a declaration to hand to an employer, or a second
# sitting of a test their child missed.
#
# The two are one table because they are one queue. What the secretary does with them differs, but
# what they need from the system is the same — see what came in, say who is working it, and record
# how it ended. Splitting them would have given the school two inboxes to remember to check.
#
# The request is the record of the asking, not of the answer. A declaration produces a document,
# and that document lives in `documents` where every other file the school holds lives; this row
# only carries the request through to the point where one exists.
class CreateGuardianRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :guardian_requests do |t|
      t.references :school, null: false, foreign_key: true
      t.references :guardian, null: false, foreign_key: true
      # Who it is about. A guardian with two children at the school asks for one of them, and a
      # declaration that does not name the student is not a declaration.
      t.references :student, null: false, foreign_key: true

      t.string :kind, null: false
      t.string :status, null: false, default: "pending"

      # What the guardian wrote. For a declaration it is what the declaration has to say; for a
      # second sitting it is why the test was missed.
      t.text :details

      # A second sitting is of one test, and the secretary cannot schedule it without knowing
      # which. Left null for declarations, which are about no subject and no date.
      t.references :subject, foreign_key: true
      t.date :reference_date

      # The school's answer, kept whether the request was met or refused — a guardian told "no"
      # will ask why, and the school needs the reason it already gave.
      t.text :resolution_note
      t.references :resolved_by, foreign_key: { to_table: :users }
      t.datetime :resolved_at

      # Staff open requests on behalf of a guardian who telephoned, so this is not always the
      # guardian's own user.
      t.references :requested_by, foreign_key: { to_table: :users }

      t.datetime :discarded_at
      t.timestamps
    end

    # What the Solicitações screen opens on: this school's queue, oldest first within a status.
    add_index :guardian_requests, %i[school_id status created_at]
    # What a guardian's own list reads.
    add_index :guardian_requests, %i[guardian_id created_at]

    add_check_constraint :guardian_requests,
                         "kind IN ('declaration', 'second_call')",
                         name: "guardian_requests_kind"
    add_check_constraint :guardian_requests,
                         "status IN ('pending', 'in_progress', 'fulfilled', 'rejected')",
                         name: "guardian_requests_status"
  end
end
