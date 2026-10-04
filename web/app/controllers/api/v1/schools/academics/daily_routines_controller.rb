# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # Infantil day cards. A teacher writes the classes they teach. manage_academic reads
        # the whole school, drafts included, and is refused with 403 on every write.
        class DailyRoutinesController < BaseController
          def index
            authorize DailyRoutine

            routines = filtered_routines.order(date: :desc, id: :desc)
            pagy, records = pagy(routines)

            render json: {
              data: DailyRoutineBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            routine = policy_scope(DailyRoutine).includes(:communication_attachments).find(params[:id])
            authorize routine

            render json: { data: DailyRoutineBlueprint.render_as_hash(routine) }
          end

          def upsert
            student = Current.school.students.kept.find(daily_routine_params[:student_id])
            return render_not_found unless writable_student?(student)

            authorize DailyRoutine.new(school: Current.school, student: student), :create?

            result = ::Academic::UpsertDailyRoutineService.call(
              school: Current.school,
              teacher: writing_teacher,
              student: student,
              attributes: daily_routine_params,
              attachment_ids: supplied_attachment_ids,
              uploaded_by: supplied_attachment_ids.nil? ? nil : Current.membership
            )
            render_routine(result)
          end

          def apply_meals
            school_class = Current.school.school_classes.kept.find(apply_meals_params[:school_class_id])
            return render_not_found unless writable_class?(school_class)

            authorize school_class, :apply_meals?, policy_class: DailyRoutinePolicy

            result = ::Academic::ApplyMealsService.call(
              school: Current.school,
              teacher: writing_teacher,
              school_class: school_class,
              date: apply_meals_params[:date],
              field: apply_meals_params[:field],
              value: apply_meals_params[:value]
            )
            render_service_result(result) do |payload|
              routines = payload.fetch(:routines)
              ActiveRecord::Associations::Preloader.new(
                records: routines, associations: :communication_attachments
              ).call
              render json: { data: DailyRoutineBlueprint.render_as_hash(routines) }
            end
          end

          # POST .../daily_routines/:id/send. Named deliver so Kernel#send stays intact.
          def deliver
            routine = policy_scope(DailyRoutine).includes(:communication_attachments).find(params[:id])
            authorize routine, :send?
            writing_teacher

            result = ::Academic::SendDailyRoutineService.call(
              school: Current.school,
              membership: Current.membership,
              routine: routine
            )
            render_routine(result) { |payload| payload.fetch(:routine) }
          end

          private

          def filtered_routines
            routines = policy_scope(DailyRoutine).includes(:communication_attachments)
            routines = routines.where(student_id: params[:student_id]) if params[:student_id].present?
            routines = routines.where(school_class_id: params[:school_class_id]) if params[:school_class_id].present?
            routines = routines.where(date: params[:date]) if params[:date].present?
            routines
          end

          def writable_student?(student)
            policy(DailyRoutine).assignable_student?(student) || manages_academic?
          end

          def writable_class?(school_class)
            policy(DailyRoutine).assignable_class?(school_class) || manages_academic?
          end

          # The same gate the policy uses. A coordinator who cannot write must hit authorize
          # and receive 403; a teacher of another class never reaches authorize and is 404.
          def manages_academic?
            policy(DailyRoutine).send(:staff_with?, :manage_academic)
          end

          def writing_teacher
            Current.school.teachers.kept.find_by!(email: Current.user.email)
          end

          def render_routine(result)
            render_service_result(result) do |payload|
              routine = block_given? ? yield(payload) : payload
              render json: { data: DailyRoutineBlueprint.render_as_hash(routine) }
            end
          end

          def daily_routine_params
            params.require(:daily_routine).permit(
              :student_id, :date, :narrative,
              :sleep_morning, :sleep_after_lunch, :sleep_afternoon,
              :interaction, :evacuation, :discomfort, :discomfort_detail,
              :meal_breakfast, :meal_lunch, :meal_afternoon_snack, :meal_dinner, :meal_hydration,
              attachment_ids: []
            )
          end

          # nil when the key was omitted. An empty array is still "sent", so the service
          # claims that set and the uploader is this membership.
          def supplied_attachment_ids
            raw = params[:daily_routine]
            return nil unless raw.respond_to?(:key?) && raw.key?(:attachment_ids)

            daily_routine_params[:attachment_ids] || []
          end

          def apply_meals_params
            params.permit(:school_class_id, :date, :field, :value)
          end
        end
      end
    end
  end
end
