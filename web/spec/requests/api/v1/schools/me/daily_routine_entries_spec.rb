# frozen_string_literal: true

require "rails_helper"

# BC11 "Rotina Infantil" as a family reads it: sent entries about their own child, and nothing
# else — not a draft, not another family's (BR-DR06).
RSpec.describe "Rotina Infantil: what the family reads", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Marcela Silva") }
  let(:pedro) { create(:student, school: school) }
  let!(:family) { create(:student_guardian, school: school, student: pedro, guardian: guardian) }
  let(:headers) { auth_headers_for(guardian_user) }
  let(:base) { "/api/v1/schools/#{school.id}/me/students/#{pedro.id}/daily_routine_entries" }

  describe "reading" do
    let!(:sent_entry) do
      create(:daily_routine_entry, :sent, school: school, student: pedro, date: Date.new(2026, 4, 14))
    end

    it "lists a sent entry about their child" do
      get base, headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([ sent_entry.id ])
    end

    # AC-DR06
    it "leaves out an entry still in draft" do
      create(:daily_routine_entry, school: school, student: pedro, date: Date.new(2026, 4, 15))

      get base, headers: headers

      expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([ sent_entry.id ])
    end

    it "filters by the from/to date range" do
      create(:daily_routine_entry, :sent, school: school, student: pedro, date: Date.new(2026, 1, 1))

      get base, params: { from: "2026-04-01", to: "2026-04-30" }, headers: headers

      expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([ sent_entry.id ])
    end
  end

  # AC-DR05
  it "returns 404 for a student outside their family" do
    other_student = create(:student, school: school)

    get "/api/v1/schools/#{school.id}/me/students/#{other_student.id}/daily_routine_entries", headers: headers

    expect(response).to have_http_status(:not_found)
  end

  it "denies an unauthenticated request with 401" do
    get base

    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body.dig("error", "code")).to eq("unauthorized")
  end
end
