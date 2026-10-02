# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class SubjectsController < BaseController
          def index
            authorize Subject

            subjects = policy_scope(Subject).search(params[:q])
            subjects = subjects.where(id: mine_subject_ids) if mine_only?
            pagy, records = pagy(subjects.order(:name))

            render json: {
              data: SubjectBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def create
            authorize Subject

            subject = Current.school.subjects.build(subject_params)
            save_and_render(subject, status: :created)
          end

          def update
            subject = policy_scope(Subject).find(params[:id])
            authorize subject

            subject.assign_attributes(subject_params)
            save_and_render(subject)
          end

          def destroy
            subject = policy_scope(Subject).find(params[:id])
            authorize subject

            subject.discarded_by = Current.user if subject.respond_to?(:discarded_by=)
            subject.discard
            head :no_content
          end

          private

          # `mine=true` narrows a teacher's dropdown to the subjects they hold a `ClassDiscipline`
          # for. Opt-in and no-op for every other role, so the plain index is unchanged.
          def mine_only?
            params[:mine] == "true" && Current.membership&.role == "teacher"
          end

          def mine_subject_ids
            teacher = Current.school.teachers.kept.find_by(email: Current.user.email)
            return [] if teacher.blank?

            Current.school.class_disciplines.kept.where(teacher_id: teacher.id).select(:subject_id)
          end

          def save_and_render(subject, status: :ok)
            if subject.save
              render json: { data: SubjectBlueprint.render_as_hash(subject) }, status: status
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: subject.errors.to_hash)
            end
          end

          def subject_params
            params.require(:subject).permit(:name)
          end
        end
      end
    end
  end
end
