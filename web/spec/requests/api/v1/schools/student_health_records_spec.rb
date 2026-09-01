# frozen_string_literal: true

require "rails_helper"

RSpec.describe "A student's health records", type: :request do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school, name: "Mariana Sales") }

  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:staff_headers) { auth_headers_for(staff_user) }

  let(:guardian_user) { create(:user) }
  let(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Carolina Sales") }
  let!(:guardian_membership) do
    create(:membership, user: guardian_user, school: school, role: "guardian")
  end
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:guardian_headers) { auth_headers_for(guardian_user) }

  let(:school_path) do
    "/api/v1/schools/#{school.id}/people/students/#{student.id}/health_records"
  end
  let(:portal_path) { "/api/v1/schools/#{school.id}/me/students/#{student.id}/health_records" }

  def pdf
    Rack::Test::UploadedFile.new(
      Rails.root.join("spec/fixtures/files/sample.pdf"), "application/pdf"
    )
  end

  def create_record(params = {}, headers: guardian_headers)
    post portal_path,
         params: { health_record: { title: "Peanut allergy", content: "Uses inhaler." }.merge(params) },
         headers: headers
  end

  describe "the family managing records" do
    it "creates a record for their own child" do
      create_record
      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "title")).to eq("Peanut allergy")
    end

    it "keeps multiple records instead of overwriting" do
      create_record({ title: "Peanut allergy", content: "First" })
      create_record({ title: "Asthma", content: "Second" })
      expect(StudentHealthRecord.where(student_id: student.id).count).to eq(2)
    end

    it "accepts a PDF attachment" do
      create_record({ document: pdf })
      expect(response.parsed_body.dig("data", "has_document")).to be(true)
    end

    it "refuses a file that is not a PDF" do
      create_record({ document: Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/note.txt"),
                                                              "text/plain") })
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "soft-discards a record" do
      create_record
      id = response.parsed_body.dig("data", "id")
      delete "#{portal_path}/#{id}", headers: guardian_headers
      expect(response).to have_http_status(:no_content)
      expect(StudentHealthRecord.find(id)).to be_discarded
    end

    it "does not reach another family's child" do
      stranger = create(:student, school: school)
      get "/api/v1/schools/#{school.id}/me/students/#{stranger.id}/health_records", headers: guardian_headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "the school reading records" do
    before { create_record }

    it "lists what the family wrote" do
      get school_path, headers: staff_headers
      expect(response.parsed_body["data"].map { |row| row["title"] }).to eq([ "Peanut allergy" ])
    end

    it "does not let the school create a record" do
      post school_path, params: { health_record: { title: "Staff", content: "Nope" } }, headers: staff_headers
      expect(response).to have_http_status(:not_found).or have_http_status(:forbidden)
    end

    it "does not reach another school's student" do
      other_student = create(:student, school: create(:school))
      get "/api/v1/schools/#{school.id}/people/students/#{other_student.id}/health_records", headers: staff_headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
