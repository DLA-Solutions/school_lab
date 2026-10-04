# frozen_string_literal: true

require "rails_helper"

# "Ata" (BC7) as a family reads it: published, guardian-visible incidents about their own child,
# and nothing else — not a draft, not staff_only, not another family's.
RSpec.describe "Ata: what the family reads", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Marcela Silva") }
  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:pedro) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }
  let!(:family) { create(:student_guardian, school: school, student: pedro, guardian: guardian) }
  let(:headers) { auth_headers_for(guardian_user) }
  let(:base) { "/api/v1/schools/#{school.id}/me/students/#{pedro.id}/incidents" }

  describe "reading" do
    # Shared across incidents in this school: the default factory would otherwise mint a second
    # "guardian_meeting" row per incident and collide on IncidentType's per-school uniqueness.
    let(:incident_type) { create(:incident_type, :guardian_meeting, school: school) }
    let!(:published) do
      create(:incident, :published, school: school, student: pedro, incident_type: incident_type)
    end

    it "lists a published, guardian-visible incident about their child" do
      get base, headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([ published.id ])
    end

    # AC-IN02
    it "leaves out an incident that has not been published yet" do
      create(:incident, :pending_publish, school: school, student: pedro, incident_type: incident_type)

      get base, headers: headers

      expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([ published.id ])
    end

    it "leaves out a staff_only incident even if somehow published" do
      create(:incident, school: school, student: pedro, incident_type: incident_type,
                        visibility: "staff_only", published_at: Time.current)

      get base, headers: headers

      expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([ published.id ])
    end

    # The approval workflow is an internal staff concern — a family must never see who signed off.
    it "does not expose the internal approval slots" do
      get base, headers: headers

      row = response.parsed_body["data"].first
      expect(row).not_to have_key("coordination_approved_by_membership_id")
      expect(row).not_to have_key("director_approved_by_membership_id")
      expect(row).not_to have_key("coordination_approved_at")
      expect(row).not_to have_key("director_approved_at")
      expect(row).not_to have_key("reported_by_membership_id")
      expect(row["student_name"]).to eq("Pedro Silva")
    end
  end

  # AC-IN03
  it "returns 404 for a student outside their family" do
    other_student = create(:student, school: school)

    get "/api/v1/schools/#{school.id}/me/students/#{other_student.id}/incidents", headers: headers

    expect(response).to have_http_status(:not_found)
  end

  it "denies an unauthenticated request with 401" do
    get base

    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body.dig("error", "code")).to eq("unauthorized")
  end
end
