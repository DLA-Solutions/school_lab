# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # "Ata" (BC7) as a family reads it: published, guardian-visible incidents about one of
        # their own children — nothing still a draft, nothing `staff_only`, and nothing about a
        # child outside their family (IncidentPolicy::Scope enforces both; a student id for a
        # child not theirs 404s before the scope is even built).
        class IncidentsController < BaseController
          def index
            authorize Incident

            student = Current.guardian.students.kept.find(params[:student_id])

            incidents = policy_scope(Incident)
                        .where(student_id: student.id)
                        .includes(:student, :incident_type)
                        .order(created_at: :desc)
            pagy, records = pagy(incidents)

            render json: {
              data: IncidentBlueprint.render_as_hash(records, view: :guardian),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end
        end
      end
    end
  end
end
