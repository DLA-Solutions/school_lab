# frozen_string_literal: true

require "rails_helper"

RSpec.describe "A student's health profile", type: :request do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school, name: "Mariana Sales") }

  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:staff_headers) { auth_headers_for(staff_user) }

  let(:guardian_user) { create(:user) }
  let(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:guardian_headers) { auth_headers_for(guardian_user) }

  let(:school_path) { "/api/v1/schools/#{school.id}/people/students/#{student.id}/health_profile" }
  let(:portal_path) { "/api/v1/schools/#{school.id}/me/students/#{student.id}/health_profile" }

  it "creates the profile on first update" do
    put portal_path, params: { health_profile: { blood_type: "O+" } }, headers: guardian_headers, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig("data", "blood_type")).to eq("O+")
  end

  it "shows the profile to staff" do
    create(:student_health_profile, school: school, student: student, blood_type: "B+")
    get school_path, headers: staff_headers
    expect(response.parsed_body.dig("data", "blood_type")).to eq("B+")
  end

  it "does not let staff update the profile" do
    put school_path, params: { health_profile: { blood_type: "AB+" } }, headers: staff_headers, as: :json
    expect(response).to have_http_status(:not_found).or have_http_status(:forbidden)
  end
end
