# frozen_string_literal: true

require "rails_helper"

# "Ata" (BC7) as staff work it: a teacher's own classes, or school-wide for manage_academic staff.
# Approval (BR-IN08) and guardian publish are independent of each other and of who created the
# record.
RSpec.describe "Ata: what staff record and approve", type: :request do
  let(:school) { create(:school) }
  let(:base) { "/api/v1/schools/#{school.id}/academics/incidents" }

  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let!(:pedro) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }
  let!(:mother) { create(:guardian, school: school, name: "Marcela Silva") }
  let!(:family) do
    create(:student_guardian, school: school, student: pedro, guardian: mother, relationship: "mother")
  end

  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }
  let(:teacher_headers) { auth_headers_for(teacher_user) }
  let(:maths) { create(:subject, school: school, name: "Matemática") }

  before do
    create(:teaching_assignment, school: school, teacher: carla, school_class: school_class, subject: maths)
  end

  def manage_academic_staff
    user = create(:user)
    membership = create(:membership, user: user, school: school, role: "staff")
    template = create(:school_role_template, school: school)
    create(:role_template_permission, school: school, role_template: template, permission_key: "manage_academic")
    create(:staff_profile, membership: membership, school: school, role_template: template)
    user
  end

  def create_incident(headers:, student: pedro, incident_type: nil, visibility: nil)
    body = { student_id: student.id, description: "Aconteceu algo na sala." }
    body[:incident_type_id] = incident_type.id if incident_type
    body[:visibility] = visibility if visibility
    post base, params: { incident: body }, headers: headers, as: :json
    response.parsed_body["data"]
  end

  describe "creating one" do
    # AC-IN01
    it "defaults a health-category incident to staff_only regardless of the type's own default" do
      health_type = create(:incident_type, :health, school: school, default_visibility: "guardian")

      incident = create_incident(headers: teacher_headers, incident_type: health_type)

      expect(response).to have_http_status(:created)
      expect(incident["visibility"]).to eq("staff_only")
    end

    # Teacher creation is narrowed to assigned classes (BR-IN03).
    it "refuses a student outside the teacher's assigned classes" do
      other_class = create(:school_class, school: school, name: "B", year: 2026)
      stranger = create(:student, school: school, school_class: other_class, name: "Outra Criança")

      create_incident(headers: teacher_headers, student: stranger)

      expect(response).to have_http_status(:forbidden)
    end

    # manage_academic staff create school-wide, independent of any teaching assignment (BR-IN03).
    it "lets manage_academic staff create for any student in the school" do
      other_class = create(:school_class, school: school, name: "B", year: 2026)
      unassigned_student = create(:student, school: school, school_class: other_class)
      staff_user = manage_academic_staff

      create_incident(headers: auth_headers_for(staff_user), student: unassigned_student)

      expect(response).to have_http_status(:created)
    end

    # AC-IN08 bullet 1 — a client that never touches guardian_ids still gets the student's
    # current student_guardians snapshotted (BR-IN11's default).
    it "snapshots the student's current guardians by default when guardian_ids is omitted" do
      incident = create_incident(headers: teacher_headers)

      expect(response).to have_http_status(:created)
      expect(incident["guardians"]).to eq(
        [ { "guardian_id" => mother.id, "name" => "Marcela Silva", "relationship" => "mother" } ]
      )
    end

    # BR-IN11/UC-IN06 — an explicit guardian_ids overrides the default snapshot.
    it "snapshots exactly the guardians given in guardian_ids" do
      unrelated_guardian = create(:guardian, school: school, name: "Avó Teresa")

      post base, params: {
        incident: {
          student_id: pedro.id,
          description: "Aconteceu algo na sala.",
          guardian_ids: [ unrelated_guardian.id ]
        }
      }, headers: teacher_headers, as: :json

      expect(response).to have_http_status(:created)
      guardians = response.parsed_body.dig("data", "guardians")
      expect(guardians).to eq(
        [ { "guardian_id" => unrelated_guardian.id, "name" => "Avó Teresa", "relationship" => "other" } ]
      )
    end
  end

  # BR-IN10/UC-IN05 — reported_by_membership_id only narrows the already-schoolwide
  # manage_academic list; it has no effect on a teacher's own already-scoped list (AC-IN07).
  describe "listing filtered by author (BR-IN10/UC-IN05)" do
    # Shared across every example in this block -- `:incident_type`'s factory default
    # (`:guardian_meeting`) is a system row, unique per school, so a second `create(:incident, ...)`
    # in the same example/school must reuse one rather than let the factory provision a second.
    let(:incident_type) { create(:incident_type, :guardian_meeting, school: school) }

    let!(:teacher_incident) do
      create(:incident, school: school, student: pedro, incident_type: incident_type,
                        reported_by_membership: teacher_membership)
    end

    # AC-IN07 bullet 1 — "minhas atas".
    it "narrows a manage_academic staff member to only their own incidents" do
      staff_user = manage_academic_staff
      staff_membership = Membership.find_by!(user: staff_user, school: school)
      own_incident = create(:incident, school: school, student: pedro, incident_type: incident_type,
                                        reported_by_membership: staff_membership)

      get base, params: { reported_by_membership_id: staff_membership.id }, headers: auth_headers_for(staff_user)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"].pluck("id")).to eq([ own_incident.id ])
    end

    # AC-IN07 bullet 2 — any other staff/teacher membership id shows that person's atas.
    it "narrows a manage_academic staff member to another staff or teacher's incidents" do
      staff_user = manage_academic_staff

      get base, params: { reported_by_membership_id: teacher_membership.id }, headers: auth_headers_for(staff_user)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"].pluck("id")).to eq([ teacher_incident.id ])
    end

    # AC-IN07 bullet 3 — a teacher-role requester's result is unchanged, even naming someone
    # else's membership id: the filter must have no effect, never narrow their own scope to zero.
    it "has no effect for a teacher-role requester, regardless of the value" do
      other_staff_user = manage_academic_staff
      other_staff_membership = Membership.find_by!(user: other_staff_user, school: school)
      other_incident = create(:incident, school: school, student: pedro, incident_type: incident_type,
                                          reported_by_membership: other_staff_membership)

      get base, headers: teacher_headers
      unfiltered_ids = response.parsed_body["data"].pluck("id")

      get base, params: { reported_by_membership_id: other_staff_membership.id }, headers: teacher_headers
      filtered_ids = response.parsed_body["data"].pluck("id")

      expect(filtered_ids).to match_array(unfiltered_ids)
      expect(filtered_ids).to include(teacher_incident.id, other_incident.id)
    end
  end

  describe "approving (BR-IN08)" do
    let!(:incident) { create(:incident, school: school, student: pedro) }

    # AC-IN04 — two independent slots, either order, status only flips once both are filled.
    it "fills each slot independently and only approves once both are present" do
      coord_user = create(:user)
      coord_membership = create(:membership, :coordination, user: coord_user, school: school)

      post "#{base}/#{incident.id}/approve", headers: auth_headers_for(coord_user), as: :json

      expect(response).to have_http_status(:ok)
      body = response.parsed_body["data"]
      expect(body["status"]).to eq("pending_approval")
      expect(body["coordination_approved_by_membership_id"]).to eq(coord_membership.id)
      expect(body["director_approved_by_membership_id"]).to be_nil

      director_user = create(:user)
      create(:membership, :director, user: director_user, school: school)

      post "#{base}/#{incident.id}/approve", headers: auth_headers_for(director_user), as: :json

      expect(response).to have_http_status(:ok)
      body = response.parsed_body["data"]
      expect(body["status"]).to eq("approved")
      expect(body["coordination_approved_at"]).to be_present
      expect(body["director_approved_at"]).to be_present
    end

    # AC-IN05 — manage_academic alone never substitutes for the specific role template.
    it "refuses a manage_academic staff member who holds neither template" do
      staff_user = manage_academic_staff

      post "#{base}/#{incident.id}/approve", headers: auth_headers_for(staff_user), as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "publishing to guardians" do
    # staff_only can never be published (BR-IN02).
    it "refuses to publish a staff_only incident" do
      incident = create(:incident, school: school, student: pedro, visibility: "staff_only")
      staff_user = manage_academic_staff

      post "#{base}/#{incident.id}/publish", headers: auth_headers_for(staff_user), as: :json

      expect(response).to have_http_status(:conflict)
    end

    it "publishes a guardian_on_publish incident and stamps when" do
      incident = create(:incident, :pending_publish, school: school, student: pedro)
      staff_user = manage_academic_staff

      post "#{base}/#{incident.id}/publish", headers: auth_headers_for(staff_user), as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"]["published_at"]).to be_present
    end
  end

  describe "the staff grid" do
    # BR-IN11 — the grid reads the persisted snapshot, not a live derivation from the student's
    # current student_guardians, so the test sets it up explicitly rather than relying on the
    # factory (which, unlike CreateIncidentService, does not auto-snapshot).
    it "carries the student's name and every snapshotted guardian" do
      incident = create(:incident, school: school, student: pedro, reported_by_membership: teacher_membership)
      create(:incident_guardian, incident: incident, guardian: mother, name: mother.name, relationship: "mother")

      get base, headers: teacher_headers

      expect(response).to have_http_status(:ok)
      row = response.parsed_body["data"].first
      expect(row["student_name"]).to eq("Pedro Silva")
      expect(row["guardians"]).to eq(
        [ { "guardian_id" => mother.id, "name" => "Marcela Silva", "relationship" => "mother" } ]
      )
    end

    # AC-IN08 bullet 3 — a later change to the family's live student_guardians links does not
    # change an already-saved incident's snapshot.
    it "keeps showing the same guardian names after the family's student_guardians links change" do
      incident = create(:incident, school: school, student: pedro, reported_by_membership: teacher_membership)
      create(:incident_guardian, incident: incident, guardian: mother, name: mother.name, relationship: "mother")

      family.discard!
      new_guardian = create(:guardian, school: school, name: "Novo Responsável")
      create(:student_guardian, school: school, student: pedro, guardian: new_guardian, relationship: "father")

      get base, headers: teacher_headers

      row = response.parsed_body["data"].first
      expect(row["guardians"]).to eq(
        [ { "guardian_id" => mother.id, "name" => "Marcela Silva", "relationship" => "mother" } ]
      )
    end
  end

  it "denies an unauthenticated request with 401" do
    get base

    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body.dig("error", "code")).to eq("unauthorized")
  end
end
