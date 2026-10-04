# frozen_string_literal: true

require "swagger_helper"

# "Ata" (BC7) as staff preview it: the same renderer a guardian would eventually be shown,
# gated by IncidentPolicy#show? -- a teacher sees it for their own classes, manage_academic staff
# see it school-wide, and nothing crosses a school boundary.
RSpec.describe "Api::V1::Schools::Academics::Incidents pdf", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }

  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }

  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }

  let!(:teaching_assignment) do
    create(:teaching_assignment, school: school, teacher: carla, school_class: school_class, subject: maths)
  end

  let(:incident_type) { create(:incident_type, :guardian_meeting, school: school) }
  let!(:incident) do
    create(:incident, school: school, student: student, incident_type: incident_type,
                      reported_by_membership: teacher_membership,
                      guardian_points_raised: "A família relatou dificuldade de concentração em casa.",
                      school_response: "A escola vai acompanhar com a coordenação pedagógica.")
  end
  let(:id) { incident.id }

  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/academics/incidents/{id}/pdf" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "The Ata as a PDF, for staff" do
      tags "Incidents", "Academic"
      produces "application/pdf", "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "200", "a teacher previews an incident about a student in their own class" do
        run_test! do |response|
          expect(response.media_type).to eq("application/pdf")

          text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
          expect(text).to include(school.name)
          expect(text).to include("Pedro Silva")
          expect(text).to include("Reunião com os pais")
          expect(text).to include("A família relatou dificuldade de concentração em casa.")
          expect(text).to include("A escola vai acompanhar com a coordenação pedagógica.")
        end
      end

      # BR-IN03: a teacher's view is narrowed to their own classes -- an incident about a student
      # in a class they do not teach is not theirs to preview, matching IncidentPolicy#show?.
      response "403", "a teacher previews an incident outside their own classes" do
        let(:other_class) { create(:school_class, school: school, name: "B", year: 2026) }
        let(:id) do
          stranger = create(:student, school: school, school_class: other_class, name: "Outra Criança")
          create(:incident, school: school, student: stranger, incident_type: incident_type).id
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "cross-school incident" do
        let(:id) { create(:incident, school: create(:school)).id }

        run_test!
      end
    end
  end

  # BR-IN08: the approval slots print only once filled, each with its own role label and timestamp.
  it "prints both approval slots, each with its role label and timestamp, once filled" do
    approved = create(:incident, :approved, school: school, student: student, incident_type: incident_type)

    get "/api/v1/schools/#{school.id}/academics/incidents/#{approved.id}/pdf",
        headers: auth_headers_for(teacher_user)

    expect(response).to have_http_status(:ok)
    text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
    expect(text).to include("Aprovação da coordenação")
    expect(text).to include("Aprovação da direção")
    expect(text).to include(approved.coordination_approved_at.strftime("%d/%m/%Y"))
  end

  it "prints nothing about approvals when neither slot has been filled yet" do
    get "/api/v1/schools/#{school.id}/academics/incidents/#{incident.id}/pdf",
        headers: auth_headers_for(teacher_user)

    expect(response).to have_http_status(:ok)
    text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
    expect(text).not_to include("Aprovação da coordenação")
    expect(text).not_to include("Aprovação da direção")
  end

  # manage_academic staff preview school-wide, independent of any teaching assignment (BR-IN03) --
  # same rule `show?` already applies to index/create.
  it "lets manage_academic staff preview any incident in the school" do
    other_class = create(:school_class, school: school, name: "B", year: 2026)
    unassigned_student = create(:student, school: school, school_class: other_class)
    unassigned_incident = create(:incident, school: school, student: unassigned_student, incident_type: incident_type)

    staff_user = create(:user)
    membership = create(:membership, user: staff_user, school: school, role: "staff")
    template = create(:school_role_template, school: school)
    create(:role_template_permission, school: school, role_template: template, permission_key: "manage_academic")
    create(:staff_profile, membership: membership, school: school, role_template: template)

    get "/api/v1/schools/#{school.id}/academics/incidents/#{unassigned_incident.id}/pdf",
        headers: auth_headers_for(staff_user)

    expect(response).to have_http_status(:ok)
  end
end
