# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # A teacher's structured plan (BR-LP07) for one class_discipline on one calendar day
        # (BR-LP01). No status, no submission/approval workflow (BR-LP05) — `upsert` is immediate
        # create-or-update by `(class_discipline_id, date)` (BR-LP04).
        class LessonPlansController < BaseController
          # BR-LP07 template fields — all optional (AC-LP05).
          TEMPLATE_PARAM_KEYS = %i[
            duration unit_stage topic general_objective specific_objectives bncc_competencies
            other_competencies resources_materials assessment_types assessment_formats
          ].freeze

          before_action :set_school_context!

          def index
            authorize LessonPlan

            plans = policy_scope(LessonPlan).includes(class_discipline: %i[school_class subject]).order(:date)
            plans = plans.where(class_discipline_id: filtered_class_discipline_ids) if filter_by_class_or_subject?
            plans = plans.where(date: params[:from]..) if params[:from].present?
            plans = plans.where(date: ..params[:to]) if params[:to].present?

            pagy, records = pagy(plans)
            render json: {
              data: LessonPlanBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            lesson_plan = policy_scope(LessonPlan).find(params[:id])
            authorize lesson_plan

            render json: { data: LessonPlanBlueprint.render_as_hash(lesson_plan) }
          end

          # PUT /lesson_plans — upsert by (school_class_id, subject_id, date), BR-LP04.
          def upsert
            class_discipline = find_class_discipline
            return render_error(:not_found, status: :not_found) if class_discipline.blank?

            authorize LessonPlan.new(class_discipline: class_discipline), :create?

            result = ::LessonPlans::UpsertLessonPlanService.call(
              class_discipline: class_discipline,
              date: lesson_plan_params[:date],
              attributes: lesson_plan_params.slice(*TEMPLATE_PARAM_KEYS)
            )
            render_service_result(result) do |plan|
              render json: { data: LessonPlanBlueprint.render_as_hash(plan) }
            end
          end

          # Deliberately tenant-scoped only (not `policy_scope`, which LessonPlanPolicy::Scope
          # already narrows to a teacher's own class_disciplines) -- `authorize ..., :show?` is
          # what must decide access here, so a teacher not assigned to this class_discipline gets
          # the `403` AC-LP06 calls for, not a `404` that would hide the plan's existence instead.
          def pdf
            lesson_plan = LessonPlan.where(school_id: Current.school.id).find(params[:id])
            authorize lesson_plan, :show?

            result = ::Academic::RenderLessonPlanPdfService.call(lesson_plan: lesson_plan)
            if result.failure?
              return render_error(result.error_code, status: :unprocessable_content, details: result.details)
            end

            send_data result.data.fetch(:pdf),
                      filename: result.data.fetch(:filename),
                      type: "application/pdf",
                      disposition: "inline"
          end

          private

          # Scoped via policy_scope(ClassDiscipline), which only enforces tenant — NOT
          # manage_enrollment — matching grade_books_controller's find_class_discipline. Teacher
          # ownership is enforced afterward by `authorize ..., :create?` (LessonPlanPolicy), which
          # raises Pundit::NotAuthorizedError -> 403 for a teacher not assigned to this
          # class_discipline (AC-LP04), rescued by BaseController already.
          def find_class_discipline
            school_class = policy_scope(SchoolClass).find_by(id: lesson_plan_params[:school_class_id])
            return nil if school_class.blank?

            subject = policy_scope(Subject).find_by(id: lesson_plan_params[:subject_id])
            return nil if subject.blank?

            policy_scope(ClassDiscipline).kept.find_by(school_class: school_class, subject: subject)
          end

          def lesson_plan_params
            params.require(:lesson_plan).permit(
              :school_class_id, :subject_id, :date,
              :duration, :unit_stage, :topic, :general_objective, :specific_objectives,
              :bncc_competencies, :other_competencies, :resources_materials,
              assessment_types: [], assessment_formats: []
            )
          end

          def filter_by_class_or_subject?
            params[:school_class_id].present? || params[:subject_id].present?
          end

          def filtered_class_discipline_ids
            scope = ClassDiscipline.kept.where(school_id: Current.school.id)
            scope = scope.where(school_class_id: params[:school_class_id]) if params[:school_class_id].present?
            scope = scope.where(subject_id: params[:subject_id]) if params[:subject_id].present?
            scope.select(:id)
          end
        end
      end
    end
  end
end
