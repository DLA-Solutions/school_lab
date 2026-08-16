# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # Preceptoria as a teacher works it: what they have written, and what they are still
        # writing.
        class PreceptorshipReportsController < BaseController
          include PreceptorshipPdfDelivery

          def index
            authorize PreceptorshipReport

            reports = policy_scope(PreceptorshipReport)
                      .includes(:student, :teacher, :academic_period)
            reports = filter(reports).order(created_at: :desc)
            pagy, records = pagy(reports)

            render json: {
              data: PreceptorshipReportBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          # The students this teacher may write about.
          #
          # A screen for writing preceptoria has to offer a roll, and the register's own student
          # list is gated on `manage_people` — which a teacher does not hold. Rather than widen
          # that permission, the roll is answered here, where the narrowing rule already lives.
          def roll
            authorize PreceptorshipReport, :index?

            students = Current.school.students.kept.includes(:school_class).order(:name)
            students = students.select { |student| teaches?(student) }

            render json: {
              data: students.map do |student|
                {
                  id: student.id,
                  name: student.name,
                  school_class_name: student.school_class&.full_name
                }
              end
            }
          end

          def show
            report = find_report
            authorize report

            render json: { data: PreceptorshipReportBlueprint.render_as_hash(report) }
          end

          def create
            authorize PreceptorshipReport

            student = find_student
            return render_not_your_student unless teaches?(student)

            result = ::Preceptorship::WriteReportService.call(
              school: Current.school,
              teacher: current_teacher,
              author: Current.user,
              params: report_params
            )
            render_report(result, success_status: :created)
          end

          def update
            report = find_report
            authorize report

            result = ::Preceptorship::WriteReportService.call(
              school: Current.school,
              teacher: report.teacher,
              author: Current.user,
              params: report_params.except(:student_id),
              report: report
            )
            render_report(result)
          end

          def destroy
            report = find_report
            authorize report

            report.discard
            head :no_content
          end

          def publish
            report = find_report
            authorize report, :publish?

            result = ::Preceptorship::PublishReportService.call(report: report)
            render_report(result)
          end

          # The same bytes the family gets, so a teacher can see what they handed over.
          def pdf
            report = find_report
            authorize report, :pdf?

            send_report_pdf(report)
          end

          private

          def render_report(result, success_status: :ok)
            render_service_result(result, success_status: success_status) do |report|
              render json: { data: PreceptorshipReportBlueprint.render_as_hash(report) },
                     status: success_status
            end
          end

          def find_report
            policy_scope(PreceptorshipReport).find(params[:id])
          end

          # Read from the school rather than through `policy_scope(Student)`: the student scope is
          # gated on `manage_people`, which a teacher does not hold — using it here would lock
          # preceptoria to the office and away from the only people who write it. The school
          # bounds the lookup, and `teaches?` below is what narrows it to this teacher's roll.
          def find_student
            Current.school.students.kept.find(report_params[:student_id])
          end

          # A teacher's own list is the common read; the whole school's is for coordination.
          def filter(scope)
            scope = scope.where(student_id: params[:student_id]) if params[:student_id].present?
            scope = scope.where(status: params[:status]) if %w[draft published].include?(params[:status])
            scope = scope.where(teacher_id: current_teacher.id) if params[:mine] == "true" && current_teacher
            scope
          end

          # A teacher writes about the students they teach and no others. Staff who hold `teach`
          # without being a teacher — coordination — are not narrowed this way: they are the ones
          # who write about a child whose teacher has left.
          #
          # Mirrors `teaches?` on the mark sheet, widened from a lesson to a cohort: preceptoria
          # is about the student, not about one subject.
          def teaches?(student)
            return true unless Current.membership&.role == "teacher"
            return false if current_teacher.blank?
            return false if student.school_class_id.blank?

            current_teacher.teaching_assignments.kept.exists?(school_class_id: student.school_class_id)
          end

          def current_teacher
            @current_teacher ||= Current.school.teachers.kept.find_by(email: Current.user.email)
          end

          def render_not_your_student
            render_error(:forbidden, status: :forbidden,
                                     details: { base: [ I18n.t("api.errors.not_your_student") ] })
          end

          def report_params
            params.require(:preceptorship_report).permit(:student_id, :academic_period_id, :body)
          end
        end
      end
    end
  end
end
