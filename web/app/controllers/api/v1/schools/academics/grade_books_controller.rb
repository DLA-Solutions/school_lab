# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # The grade book for one class and one subject: the roster down, each period's own
        # components across. Read whole — one period's template can differ in components/weights
        # from another's — and written a cell at a time via `Grades::UpsertGradeEntryService`.
        class GradeBooksController < BaseController
          def show
            authorize EvaluationComponent, :index?

            class_discipline = find_class_discipline
            return render_not_teaching unless teaches?(class_discipline)

            render json: { data: GradeBookBlueprint.render_as_hash(grade_book_for(class_discipline)) }
          end

          # One cell. `PUT` rather than `POST`: the mark for a student in a component in a period
          # is one thing whether or not it has been given yet, and the screen re-sends it whenever
          # it changes.
          def update_entry
            authorize GradeEntry, :update?

            class_discipline = find_class_discipline
            return render_not_teaching unless teaches?(class_discipline)

            student = policy_scope(Student).find(entry_params[:student_id])
            academic_period = policy_scope(AcademicPeriod).find(entry_params[:academic_period_id])
            evaluation_component = policy_scope(EvaluationComponent).find(entry_params[:evaluation_component_id])

            result = Grades::UpsertGradeEntryService.call(
              class_discipline: class_discipline,
              academic_period: academic_period,
              evaluation_component: evaluation_component,
              student: student,
              value: entry_params[:value],
              entered_by_membership: Current.membership
            )

            render_service_result(result) do |entry|
              render json: {
                data: {
                  student_id: student.id,
                  academic_period_id: academic_period.id,
                  evaluation_component_id: evaluation_component.id,
                  value: entry.value
                }
              }
            end
          end

          private

          def find_class_discipline
            school_class = policy_scope(SchoolClass).find(params[:school_class_id])
            subject = policy_scope(Subject).find(params[:subject_id])

            class_discipline = policy_scope(ClassDiscipline).find_by(
              school_class: school_class, subject: subject
            )
            class_discipline || (raise ActiveRecord::RecordNotFound)
          end

          # Everything the grid needs in one read: the roster, the year's periods — each with its
          # own template's components — and the marks already given, keyed so the blueprint can
          # find a cell without scanning.
          def grade_book_for(class_discipline)
            school_class = class_discipline.school_class
            subject = class_discipline.subject

            periods = policy_scope(AcademicPeriod)
                      .joins(:school_year)
                      .merge(SchoolYear.kept.for_calendar_year(school_class.year))
                      .order(:sequence)
                      .to_a

            components_by_period = periods.index_with do |period|
              template = EvaluationTemplate.current.find_by(
                school_class: school_class, academic_period: period
              )
              next [] if template.blank?

              template.evaluation_components.kept.where(class_discipline: class_discipline)
                      .order(:position).to_a
            end
            all_components = components_by_period.values.flatten

            students = school_class.students.kept.order(:name).to_a

            entries = policy_scope(GradeEntry).kept.where(
              class_discipline: class_discipline,
              student: students,
              academic_period: periods,
              evaluation_component: all_components
            ).index_by { |entry| [ entry.student_id, entry.academic_period_id, entry.evaluation_component_id ] }

            {
              school_class: school_class,
              subject: subject,
              class_discipline: class_discipline,
              year: school_class.year,
              periods: periods,
              components_by_period: components_by_period,
              students: students,
              entries: entries
            }
          end

          # A teacher marks the disciplines they are assigned to and no others. Staff who
          # administer the school — anyone holding the permission without being a teacher — are
          # not narrowed this way, since they are the ones who fix a mark after the teacher has
          # gone.
          def teaches?(class_discipline)
            return true unless Current.membership&.role == "teacher"

            teacher = Current.school.teachers.kept.find_by(email: Current.user.email)
            return false if teacher.blank?

            class_discipline.teacher_id == teacher.id
          end

          def render_not_teaching
            render_error(:forbidden, status: :forbidden,
                                     details: { base: [ I18n.t("api.errors.not_your_lesson") ] })
          end

          def entry_params
            params.require(:grade_entry).permit(
              :student_id, :academic_period_id, :evaluation_component_id, :value
            )
          end
        end
      end
    end
  end
end
