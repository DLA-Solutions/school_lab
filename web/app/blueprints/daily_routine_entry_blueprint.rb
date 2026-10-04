# frozen_string_literal: true

class DailyRoutineEntryBlueprint < Blueprinter::Base
  identifier :id

  fields :student_id, :date, :snack_eaten, :poop_count, :pee_count, :notes, :status,
         :sent_at, :sent_by_membership_id, :recorded_by_membership_id, :created_at, :updated_at
end
