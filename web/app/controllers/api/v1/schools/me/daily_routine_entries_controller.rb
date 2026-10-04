# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # BC11 "Rotina Infantil" as a family reads it: `sent` entries about one of their own
        # children only — never a draft, never another family's (BR-DR06). UC-DR04.
        class DailyRoutineEntriesController < BaseController
          def index
            authorize DailyRoutineEntry

            student = Current.guardian.students.kept.find(params[:student_id])

            entries = policy_scope(DailyRoutineEntry).where(student_id: student.id).order(date: :desc)
            entries = entries.where(date: params[:from]..) if params[:from].present?
            entries = entries.where(date: ..params[:to]) if params[:to].present?

            render json: { data: DailyRoutineEntryBlueprint.render_as_hash(entries) }
          end
        end
      end
    end
  end
end
