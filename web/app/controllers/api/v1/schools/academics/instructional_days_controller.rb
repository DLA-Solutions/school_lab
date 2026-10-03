# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # Thin read-only passthrough for UC-LP01: resolves the class's school year by calendar
        # year, then reads the same `school_instructional_days` table the platform-side route
        # (Schools::InstructionalDaysController, BR-SY10) owns. No write action here — marking
        # days instructional is a platform/admin action, not an academics one.
        class InstructionalDaysController < BaseController
          before_action :set_school_context!

          def show
            authorize SchoolInstructionalDay, policy_class: SchoolInstructionalDayPolicy

            school_class = policy_scope(SchoolClass).find(params[:school_class_id])
            school_year = policy_scope(SchoolYear).kept.for_calendar_year(school_class.year).first

            days = school_year ? policy_scope(SchoolInstructionalDay).where(school_year: school_year).order(:date) : []

            render json: { data: SchoolInstructionalDayBlueprint.render_as_hash(days) }
          end
        end
      end
    end
  end
end
