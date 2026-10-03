# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # "Ata" (BC7) as staff work it: a teacher's own classes, or school-wide for staff who hold
        # `manage_academic`. Approval (BR-IN08) and guardian publish (BR-IN02) are independent
        # member actions layered on top of create — see IncidentPolicy for both gates.
        class IncidentsController < BaseController
          def index
            authorize Incident

            incidents = policy_scope(Incident).includes(:student, :incident_type, :reported_by_membership)
            incidents = incidents.where(student_id: params[:student_id]) if params[:student_id].present?
            incidents = incidents.order(created_at: :desc)
            pagy, records = pagy(incidents)

            render json: {
              data: IncidentBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def create
            authorize Incident

            student = find_student
            return render_not_your_student unless policy(Incident).assignable_student?(student)

            result = ::Academic::CreateIncidentService.call(
              school: Current.school,
              student: student,
              reported_by_membership: Current.membership,
              incident_type_id: incident_params[:incident_type_id],
              description: incident_params[:description],
              guardian_points_raised: incident_params[:guardian_points_raised],
              school_response: incident_params[:school_response],
              visibility: incident_params[:visibility]
            )
            render_incident(result, success_status: :created)
          end

          def approve
            incident = find_incident
            authorize incident, :approve?

            result = ::Academic::ApproveIncidentService.call(incident: incident, membership: Current.membership)
            render_incident(result)
          end

          def publish
            incident = find_incident
            authorize incident, :publish?

            result = ::Academic::PublishIncidentService.call(incident: incident)
            render_incident(result)
          end

          private

          def render_incident(result, success_status: :ok)
            render_service_result(result, success_status: success_status) do |incident|
              render json: { data: IncidentBlueprint.render_as_hash(incident) }, status: success_status
            end
          end

          def find_incident
            policy_scope(Incident).find(params[:id])
          end

          # Read from the school rather than through `policy_scope(Student)`: the student scope is
          # gated on `manage_people`, which a teacher does not hold — using it here would lock
          # incident filing to the office. `IncidentPolicy#assignable_student?` narrows who may
          # actually file against this student (BR-IN03).
          def find_student
            Current.school.students.kept.find(incident_params[:student_id])
          end

          def render_not_your_student
            render_error(:forbidden, status: :forbidden,
                                     details: { base: [ I18n.t("api.errors.not_your_student") ] })
          end

          def incident_params
            params.require(:incident).permit(
              :incident_type_id, :student_id, :description,
              :guardian_points_raised, :school_response, :visibility
            )
          end
        end
      end
    end
  end
end
