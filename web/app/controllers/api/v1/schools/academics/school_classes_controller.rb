# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class SchoolClassesController < BaseController
          def index
            authorize SchoolClass

            classes = policy_scope(SchoolClass)
                      .includes(teaching_assignments: :subject)
                      .order(year: :desc, grade_level: :asc, shift: :asc, name: :asc)
            classes = classes.for_year(params[:year]) if params[:year].present?
            classes = classes.for_shift(params[:shift]) if params[:shift].present?
            classes = classes.for_grade_level(params[:grade_level]) if params[:grade_level].present?
            classes = classes.search(params[:q])
            classes = classes.where(id: mine_class_ids) if mine_only?
            classes = classes.where(id: teaching_class_ids) if teaching_assignment_only?

            pagy, records = pagy(classes)

            render json: {
              data: SchoolClassBlueprint.render_as_hash(records, view: :with_subjects),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            school_class = policy_scope(SchoolClass).find(params[:id])
            authorize school_class

            render json: {
              data: SchoolClassBlueprint.render_as_hash(school_class, view: :with_subjects)
            }
          end

          def create
            authorize SchoolClass

            school_class = Current.school.school_classes.build(school_class_params)
            save_and_render(school_class, status: :created)
          end

          def update
            school_class = policy_scope(SchoolClass).find(params[:id])
            authorize school_class

            school_class.assign_attributes(school_class_params)
            save_and_render(school_class)
          end

          # A cohort is discarded, not erased: teaching assignments and any contract that named it
          # keep pointing at a row that still exists. Refused while students are still enrolled —
          # see `SchoolClass#deletable?`.
          def destroy
            school_class = policy_scope(SchoolClass).find(params[:id])
            authorize school_class

            unless school_class.deletable?
              return render_error(
                :validation_error,
                status: :unprocessable_content,
                details: { base: [ I18n.t("api.errors.school_class_has_students") ] }
              )
            end

            school_class.discard
            head :no_content
          end

          private

          # `mine=true` narrows a teacher's dropdown to the classes they hold a `ClassDiscipline`
          # for — the same source of truth the grade book uses to decide who may write a cell.
          # Opt-in and no-op for every other role, so the plain index behaves exactly as before.
          def mine_only?
            params[:mine] == "true" && Current.membership&.role == "teacher"
          end

          def mine_class_ids
            teacher = teacher_for_current_user
            return [] if teacher.blank?

            Current.school.class_disciplines.kept.where(teacher_id: teacher.id)
                   .select(:school_class_id)
          end

          # Family chat lists the classes a teacher actually teaches. That link is a kept
          # teaching assignment, not a grade-book class discipline. `mine=true` stays on
          # class disciplines so the grade book is unchanged. Opt-in, and a no-op unless
          # the caller is a teacher — `teach` is enough; `manage_people` is not required.
          def teaching_assignment_only?
            params[:assignment] == "teaching" && Current.membership&.role == "teacher"
          end

          def teaching_class_ids
            teacher = teacher_for_current_user
            return [] if teacher.blank?

            Current.school.teaching_assignments.kept.where(teacher_id: teacher.id)
                   .select(:school_class_id)
          end

          def teacher_for_current_user
            return if Current.user&.email.blank?

            Current.school.teachers.kept.find_by(email: Current.user.email)
          end

          def save_and_render(school_class, status: :ok)
            if school_class.save
              render json: {
                data: SchoolClassBlueprint.render_as_hash(school_class, view: :with_subjects)
              }, status: status
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: school_class.errors.to_hash)
            end
          end

          def school_class_params
            params.require(:school_class).permit(:name, :grade_level, :shift, :year)
          end
        end
      end
    end
  end
end
