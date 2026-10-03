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
          include IncidentPdfDelivery

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

          # What the family keeps: the same document staff see, scoped to a published,
          # guardian-visible incident about one of their own children. `policy_scope` here (unlike
          # the staff controller's `pdf`) is exactly what the guardian branch of `show?` already
          # means -- not-yet-published or another family's incident both resolve to "not in scope",
          # 404, same rigor as cross-school (LGPD).
          def pdf
            incident = policy_scope(Incident).find(params[:id])
            authorize incident, :show?

            send_incident_pdf(incident)
          end
        end
      end
    end
  end
end
