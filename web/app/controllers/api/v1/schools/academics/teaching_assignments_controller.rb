# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # Attaches a teacher to one subject of one class. Kept separate from the teacher record so
        # a teacher can gain or lose a class without rewriting their profile.
        class TeachingAssignmentsController < BaseController
          def create
            teacher = policy_scope(Teacher).find(params[:teacher_id])
            authorize TeachingAssignment

            assignment = Current.school.teaching_assignments.build(
              assignment_params.merge(teacher: teacher)
            )

            if assignment.save
              render json: {
                data: TeacherBlueprint.render_as_hash(teacher.reload, view: :with_assignments)
              }, status: :created
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: assignment.errors.to_hash)
            end
          end

          def destroy
            assignment = policy_scope(TeachingAssignment).find(params[:id])
            authorize assignment

            assignment.discard
            head :no_content
          end

          private

          def assignment_params
            params.require(:teaching_assignment).permit(:school_class_id, :subject_id)
          end
        end
      end
    end
  end
end
