# frozen_string_literal: true

# An infantil day card. Null answers are part of the staff payload. Guardian responses drop
# those keys after render — the blueprint itself keeps them.
class DailyRoutineBlueprint < Blueprinter::Base
  identifier :id

  fields :student_id, :school_class_id, :date, :author_id, :narrative,
         :sleep_morning, :sleep_after_lunch, :sleep_afternoon,
         :interaction, :evacuation, :discomfort, :discomfort_detail,
         :meal_breakfast, :meal_lunch, :meal_afternoon_snack, :meal_dinner, :meal_hydration,
         :status, :sent_at

  field :attachment_ids do |routine|
    routine.communication_attachments.map(&:id)
  end
end
