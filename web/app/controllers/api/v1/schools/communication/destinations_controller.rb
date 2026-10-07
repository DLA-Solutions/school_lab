# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Communication
        class DestinationsController < BaseController
          before_action :set_school_context!

          DestinationRow = Struct.new(:audience, :teacher_id, :name, keyword_init: true)

          def index
            authorize Conversation, :destinations?

            student = Current.school.students.kept.find_by(id: params[:student_id])
            return render_not_found unless linked_student?(student)

            render json: { data: DestinationBlueprint.render_as_hash(destination_rows(student)) }
          end

          private

          def linked_student?(student)
            return false if student.blank?

            student.student_guardians.kept
              .where(school_id: Current.school.id)
              .joins(:guardian)
              .merge(Guardian.kept)
              .exists?(guardians: { user_id: Current.user.id })
          end

          def destination_rows(student)
            [
              destination_row("coordination"),
              destination_row("secretary"),
              *teacher_rows(student)
            ]
          end

          def teacher_rows(student)
            return [] if student.school_class_id.blank?

            assigned_teachers(student).map { |teacher| destination_row("teacher", teacher: teacher) }
          end

          def assigned_teachers(student)
            teacher_ids = TeachingAssignment.kept.where(
              school_id: Current.school.id,
              school_class_id: student.school_class_id
            ).select(:teacher_id)

            Current.school.teachers.kept.where(id: teacher_ids).order(:id)
          end

          def destination_row(audience, teacher: nil)
            DestinationRow.new(audience: audience, teacher_id: teacher&.id, name: teacher&.name)
          end
        end
      end
    end
  end
end
