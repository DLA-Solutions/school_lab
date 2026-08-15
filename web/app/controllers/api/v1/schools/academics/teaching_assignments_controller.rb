# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # Attaches a teacher to one subject of one class. Kept separate from the teacher record so
        # a teacher can gain or lose a class without rewriting their profile.
        class TeachingAssignmentsController < BaseController
          # Every lesson in the school, one row each. Narrowed by whichever of the four the caller
          # sent: a teacher's name, a subject, a cohort, or a year.
          def index
            authorize TeachingAssignment

            assignments = policy_scope(TeachingAssignment)
                          .includes(:teacher, :subject, :school_class)
                          .joins(:teacher, :subject, :school_class)
                          .order("teachers.name ASC, school_classes.year DESC, subjects.name ASC")

            assignments = apply_filters(assignments)
            pagy, records = pagy(assignments)

            render json: {
              data: TeachingAssignmentBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

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

          def apply_filters(scope)
            scope = scope.where(school_class_id: params[:school_class_id]) if params[:school_class_id].present?
            scope = scope.where(subject_id: params[:subject_id]) if params[:subject_id].present?
            scope = scope.where(school_classes: { year: params[:year] }) if params[:year].present?

            term = params[:q].to_s.strip
            return scope if term.blank?

            # One term, matched against whichever of the three names it looks like — a school
            # searching "Matemática" and one searching "Carla" both expect their rows back.
            pattern = "%#{TeachingAssignment.sanitize_sql_like(term)}%"
            scope.where(
              "teachers.name ILIKE :term OR subjects.name ILIKE :term OR school_classes.name ILIKE :term",
              term: pattern
            )
          end

          def assignment_params
            params.require(:teaching_assignment).permit(:school_class_id, :subject_id)
          end
        end
      end
    end
  end
end
