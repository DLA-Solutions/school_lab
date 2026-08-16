# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class StudentsController < BaseController
          def index
            authorize Student

            students = by_activation(policy_scope(Student))
                       .includes(:school_class, :contracts, student_guardians: :guardian)
                       .search(params[:q])
                       .order(:name)
            students = filter_by_guardian(students)
            pagy, records = pagy(students)

            render json: {
              data: StudentBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          # The roll as a printable table, grouped by cohort in teaching order, one class per page.
          # Narrowed by whatever the listing was narrowed by: a report that ignored the search
          # would disagree with the screen it was asked for from. Not paginated — the point is the
          # whole set the filters describe.
          def report
            authorize Student, :index?

            students = by_activation(policy_scope(Student))
                       .search(params[:q])
                       .includes(:school_class, student_guardians: :guardian)
                       .order(:name)
            students = filter_by_guardian(students)

            result = ::People::RenderStudentsReportService.call(
              school: Current.school,
              students: students,
              columns: params[:columns].to_s.split(",")
            )

            # A name Prawn's built-in fonts cannot draw comes back as a refusal, not a 500.
            if result.failure?
              return render_error(:validation_error, status: :unprocessable_content,
                                                     details: result.details)
            end

            send_data result.data.fetch(:pdf),
                      filename: result.data.fetch(:filename),
                      type: "application/pdf",
                      disposition: "attachment"
          end

          def show
            student = policy_scope(Student).find(params[:id])
            authorize student

            render json: { data: StudentBlueprint.render_as_hash(student) }
          end

          def create
            authorize Student

            result = ::People::CreateStudentService.call(
              school: Current.school,
              params: student_params,
              guardian_cpfs: guardian_cpf_params
            )
            render_service_result(result, success_status: :created) do |student|
              render json: { data: StudentBlueprint.render_as_hash(student) }, status: :created
            end
          end

          def update
            student = policy_scope(Student).find(params[:id])
            authorize student

            result = ::People::UpdateStudentService.call(
              student: student,
              params: student_params,
              # Only when the caller actually sent the fields: a partial update that says nothing
              # about the parents must not be read as an instruction to unlink them.
              guardian_cpfs: editing_guardians? ? guardian_cpf_params : nil,
              actor: Current.user
            )
            render_service_result(result) do |updated|
              render json: { data: StudentBlueprint.render_as_hash(updated) }
            end
          end

          def destroy
            student = policy_scope(Student).find(params[:id])
            authorize student

            result = ::People::DiscardStudentService.call(student: student, actor: Current.user)
            render_service_result(result, success_status: :no_content) do
              head :no_content
            end
          end

          # Brings a record back. Looked up outside the policy scope on purpose: that scope is
          # `kept`, and an inactive record is precisely what this action operates on.
          def activate
            record = Current.school.students.find(params[:id])
            authorize record, :update?

            result = ::People::ActivateStudentService.call(student: record, actor: Current.user)
            render_service_result(result) do |updated|
              render json: { data: StudentBlueprint.render_as_hash(updated) }
            end
          end

          private

          # `active` (the default), `inactive` or `all`. Built from the school association rather
          # than the policy scope because that scope hides discarded rows, which is the whole
          # point of asking for the inactive ones.
          def by_activation(scope)
            case params[:status]
            when "inactive" then Current.school.students.discarded
            when "all" then Current.school.students.all
            else scope
            end
          end

          # Narrows the list to the children linked to one guardian — what a contract form needs
          # to offer, rather than every student in the school. Discarded links do not count.
          def filter_by_guardian(scope)
            guardian_id = params[:guardian_id]
            return scope if guardian_id.blank?

            scope.joins(:student_guardians)
                 .merge(StudentGuardian.kept)
                 .where(student_guardians: { guardian_id: guardian_id })
                 .distinct
          end

          def student_params
            params.require(:student).permit(:name, :cpf, :rg, :birth_date, :school_class_id, :status)
          end

          # The parents are identified by CPF rather than by id: the school knows the document,
          # not our primary keys. Either may be absent, but not both.
          def guardian_cpf_params
            {
              father: params.dig(:student, :father_cpf),
              mother: params.dig(:student, :mother_cpf)
            }
          end

          # Distinguishes "cleared this parent" from "said nothing about the parents". The form
          # sends both keys every time — null for an empty field — so their presence is the signal.
          def editing_guardians?
            student = params[:student]

            student.respond_to?(:key?) && (student.key?(:father_cpf) || student.key?(:mother_cpf))
          end
        end
      end
    end
  end
end
