# frozen_string_literal: true

require "rails_helper"

# BC11 "Rotina Infantil" as staff work it: a teacher records/sends entries for their own
# assigned classes (BR-DR07); manage_academic staff do the same school-wide.
RSpec.describe "Rotina Infantil: what staff record and send", type: :request do
  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let!(:pedro) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }
  let!(:mother) { create(:guardian, school: school, name: "Marcela Silva", user: create(:user)) }
  let!(:family) { create(:student_guardian, school: school, student: pedro, guardian: mother) }

  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }
  let(:teacher_headers) { auth_headers_for(teacher_user) }

  before do
    create(:teaching_assignment, school: school, teacher: carla, school_class: school_class)
  end

  def manage_academic_staff
    user = create(:user)
    membership = create(:membership, user: user, school: school, role: "staff")
    template = create(:school_role_template, school: school)
    create(:role_template_permission, school: school, role_template: template, permission_key: "manage_academic")
    create(:staff_profile, membership: membership, school: school, role_template: template)
    user
  end

  describe "GET /school_classes/:school_class_id/daily_routine_entries (roster, UC-DR01)" do
    let(:base) { "/api/v1/schools/#{school.id}/academics/school_classes/#{school_class.id}/daily_routine_entries" }

    it "lists every student in the class, with their entry for the date when one exists" do
      create(:daily_routine_entry, school: school, student: pedro, date: Date.new(2026, 4, 14), poop_count: 2)

      get base, params: { date: "2026-04-14" }, headers: teacher_headers

      expect(response).to have_http_status(:ok)
      row = response.parsed_body["data"].first
      expect(row["student_id"]).to eq(pedro.id)
      expect(row["daily_routine_entry"]["poop_count"]).to eq(2)
    end

    it "returns unset fields for a student with no entry yet for that date" do
      get base, params: { date: "2026-04-14" }, headers: teacher_headers

      expect(response).to have_http_status(:ok)
      row = response.parsed_body["data"].first
      expect(row["student_id"]).to eq(pedro.id)
      expect(row["daily_routine_entry"]).to be_nil
    end

    # AC-DR07/BR-DR07
    it "refuses a teacher without a TeachingAssignment to this class" do
      other_user = create(:user)
      create(:membership, user: other_user, school: school, role: "teacher")
      create(:teacher, school: school, email: other_user.email)

      get base, params: { date: "2026-04-14" }, headers: auth_headers_for(other_user)

      expect(response).to have_http_status(:forbidden)
    end

    it "lets manage_academic staff open any class's roster" do
      staff_user = manage_academic_staff

      get base, params: { date: "2026-04-14" }, headers: auth_headers_for(staff_user)

      expect(response).to have_http_status(:ok)
    end

    it "denies an unauthenticated request with 401" do
      get base

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body.dig("error", "code")).to eq("unauthorized")
    end
  end

  describe "PUT /daily_routine_entries (upsert, UC-DR02/BR-DR01)" do
    let(:base) { "/api/v1/schools/#{school.id}/academics/daily_routine_entries" }

    def upsert(headers:, student: pedro, date: "2026-04-14", **fields)
      body = { student_id: student.id, date: date, **fields }
      put base, params: { daily_routine_entry: body }, headers: headers, as: :json
    end

    it "creates a draft entry on first call" do
      upsert(headers: teacher_headers, snack_eaten: true, poop_count: 1, pee_count: 3, notes: "Dormiu bem.")

      expect(response).to have_http_status(:ok)
      data = response.parsed_body["data"]
      expect(data["status"]).to eq("draft")
      expect(data["snack_eaten"]).to be(true)
      expect(data["poop_count"]).to eq(1)
      expect(data["pee_count"]).to eq(3)
      expect(data["notes"]).to eq("Dormiu bem.")
    end

    # AC-DR02
    it "updates the same row in place on a second call for the same (student, date)" do
      upsert(headers: teacher_headers, poop_count: 1)
      upsert(headers: teacher_headers, poop_count: 2)

      expect(response).to have_http_status(:ok)
      expect(DailyRoutineEntry.count).to eq(1)
      expect(response.parsed_body["data"]["poop_count"]).to eq(2)
    end

    # BR-DR04: editing after sending never reverts status.
    it "does not revert a sent entry back to draft" do
      entry = create(:daily_routine_entry, :sent, school: school, student: pedro, date: Date.new(2026, 4, 14))

      upsert(headers: teacher_headers, notes: "Edited after send")

      expect(response).to have_http_status(:ok)
      expect(entry.reload).to be_sent
      expect(response.parsed_body["data"]["notes"]).to eq("Edited after send")
    end

    # AC-DR07/BR-DR07
    it "refuses a teacher without a TeachingAssignment to the student's class" do
      other_class = create(:school_class, school: school, name: "B", year: 2026)
      stranger = create(:student, school: school, school_class: other_class)

      upsert(headers: teacher_headers, student: stranger)

      expect(response).to have_http_status(:forbidden)
    end

    it "lets manage_academic staff upsert for any student in the school" do
      staff_user = manage_academic_staff

      upsert(headers: auth_headers_for(staff_user))

      expect(response).to have_http_status(:ok)
    end

    # AC: 422 on a negative count.
    it "returns 422 for a negative poop_count" do
      upsert(headers: teacher_headers, poop_count: -1)

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "code")).to eq("validation_error")
    end

    it "denies an unauthenticated request with 401" do
      put base, params: { daily_routine_entry: { student_id: pedro.id, date: "2026-04-14" } }, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /daily_routine_entries/:id/send (UC-DR03)" do
    let!(:entry) { create(:daily_routine_entry, school: school, student: pedro, date: Date.new(2026, 4, 14)) }
    let(:path) { "/api/v1/schools/#{school.id}/academics/daily_routine_entries/#{entry.id}/send" }

    # AC-DR03
    it "transitions draft to sent, stamps sent_at, and notifies the student's guardians" do
      expect do
        post path, headers: teacher_headers, as: :json
      end.to have_enqueued_job(DailyRoutineEntries::RoutineSentJob).once

      expect(response).to have_http_status(:ok)
      data = response.parsed_body["data"]
      expect(data["status"]).to eq("sent")
      expect(data["sent_at"]).to be_present
    end

    # AC-DR04
    it "is idempotent — calling send again on an already-sent entry is a 200 with no second notification" do
      post path, headers: teacher_headers, as: :json
      expect(response).to have_http_status(:ok)
      first_sent_at = response.parsed_body["data"]["sent_at"]

      expect do
        post path, headers: teacher_headers, as: :json
      end.not_to have_enqueued_job(DailyRoutineEntries::RoutineSentJob)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"]["sent_at"]).to eq(first_sent_at)
    end

    # AC-DR07/BR-DR07
    it "refuses a teacher without a TeachingAssignment to this student's class" do
      other_class = create(:school_class, school: school, name: "B", year: 2026)
      stranger = create(:student, school: school, school_class: other_class)
      stranger_entry = create(:daily_routine_entry, school: school, student: stranger)

      post "/api/v1/schools/#{school.id}/academics/daily_routine_entries/#{stranger_entry.id}/send",
           headers: teacher_headers, as: :json

      expect(response).to have_http_status(:forbidden)
    end

    it "denies an unauthenticated request with 401" do
      post path, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
