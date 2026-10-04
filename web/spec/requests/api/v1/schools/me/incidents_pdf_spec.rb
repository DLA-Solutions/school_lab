# frozen_string_literal: true

require "swagger_helper"

# "Ata" (BC7) as a family reads it: the same PDF staff see, but only once an incident has been
# published and only about one of their own children -- IncidentPolicy::Scope already enforces
# both, reused here unchanged (no new authorization logic).
RSpec.describe "Api::V1::Schools::Me::Incidents pdf", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }

  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Marcela Silva") }

  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }
  let!(:family) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:student_id) { student.id }

  let(:incident_type) { create(:incident_type, :guardian_meeting, school: school) }
  let!(:incident) do
    create(:incident, :published, school: school, student: student, incident_type: incident_type,
                                  guardian_points_raised: "A família relatou dificuldade de concentração em casa.",
                                  school_response: "A escola vai acompanhar com a coordenação pedagógica.")
  end
  let(:id) { incident.id }

  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/me/students/{student_id}/incidents/{id}/pdf" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :student_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "The Ata as a PDF, for the family" do
      tags "Incidents", "Guardian Me"
      produces "application/pdf", "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "200", "a published, guardian-visible incident about their own child" do
        run_test! do |response|
          expect(response.media_type).to eq("application/pdf")

          text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
          expect(text).to include("Pedro Silva")
          expect(text).to include("A família relatou dificuldade de concentração em casa.")
          expect(text).to include("A escola vai acompanhar com a coordenação pedagógica.")
        end
      end

      # AC-IN02: not yet published is not theirs to see -- same rigor as a cross-family id, so
      # this reads as a plain 404 rather than a 403 that would confirm the record exists.
      response "404", "an incident not published yet" do
        let(:id) do
          create(:incident, :pending_publish, school: school, student: student,
                                               incident_type: incident_type).id
        end

        run_test!
      end

      response "404", "a staff_only incident, even if somehow published" do
        let(:id) do
          create(:incident, school: school, student: student, incident_type: incident_type,
                            visibility: "staff_only", published_at: Time.current).id
        end

        run_test!
      end

      response "404", "an incident about a child outside their family" do
        let(:id) do
          other_student = create(:student, school: school)
          create(:incident, :published, school: school, student: other_student,
                            incident_type: incident_type).id
        end

        run_test!
      end

      response "404", "cross-school incident" do
        let(:id) { create(:incident, :published, school: create(:school)).id }

        run_test!
      end
    end
  end
end
