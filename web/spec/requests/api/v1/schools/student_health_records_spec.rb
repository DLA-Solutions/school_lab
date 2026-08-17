# frozen_string_literal: true

require "rails_helper"

# What a family wants the school to know about their child — an allergy, a medication, a condition
# the staff has to recognise. The family writes it from the portal; the school reads it from the
# register, so nobody is chasing a parent for it on the day it matters.
RSpec.describe "A student's health sheet", type: :request do
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

  let(:school_path) { "/api/v1/schools/#{school.id}/people/students/#{student.id}/health_record" }
  let(:portal_path) { "/api/v1/schools/#{school.id}/me/students/#{student.id}/health_record" }

  describe "the family filling it in" do
    it "writes the sheet for their own child" do
      patch portal_path,
            params: { health_record: { content: "Alérgica a amendoim. Usa bombinha." } },
            headers: guardian_headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "content")).to eq("Alérgica a amendoim. Usa bombinha.")
      expect(response.parsed_body.dig("data", "filled")).to be(true)
    end

    # A note nobody can attribute is one nobody trusts: the secretary has to know whether the
    # allergy came from the mother or from the front desk.
    it "records who wrote it and when" do
      patch portal_path, params: { health_record: { content: "Asma" } },
                         headers: guardian_headers, as: :json

      expect(response.parsed_body.dig("data", "updated_by_name")).to eq(guardian_user.email)
      expect(response.parsed_body.dig("data", "content_updated_at")).to be_present
    end

    it "reads back what was written" do
      patch portal_path, params: { health_record: { content: "Asma" } },
                         headers: guardian_headers, as: :json

      get portal_path, headers: guardian_headers

      expect(response.parsed_body.dig("data", "content")).to eq("Asma")
    end

    # An empty sheet is a family that has not been asked yet, not a child with nothing to report.
    it "reads as empty before anyone fills it in" do
      get portal_path, headers: guardian_headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "content")).to eq("")
      expect(response.parsed_body.dig("data", "filled")).to be(false)
    end

    it "does not create a sheet just by reading one" do
      expect { get portal_path, headers: guardian_headers }
        .not_to change(StudentHealthRecord, :count)
    end

    it "keeps one sheet per child however often it is written" do
      2.times do |i|
        patch portal_path, params: { health_record: { content: "versão #{i}" } },
                           headers: guardian_headers, as: :json
      end

      expect(StudentHealthRecord.where(student_id: student.id).count).to eq(1)
      expect(student.reload.health_record.content).to eq("versão 1")
    end

    it "refuses a sheet longer than the field allows" do
      patch portal_path,
            params: { health_record: { content: "a" * (StudentHealthRecord::MAX_CONTENT_LENGTH + 1) } },
            headers: guardian_headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    # A guardian reaches their own children and nobody else's.
    it "does not reach another family's child" do
      stranger = create(:student, school: school, name: "Outro Aluno")

      get "/api/v1/schools/#{school.id}/me/students/#{stranger.id}/health_record",
          headers: guardian_headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "the school reading it" do
    before do
      patch portal_path, params: { health_record: { content: "Alérgica a amendoim." } },
                         headers: guardian_headers, as: :json
    end

    it "shows what the family wrote" do
      get school_path, headers: staff_headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "content")).to eq("Alérgica a amendoim.")
      expect(response.parsed_body.dig("data", "student_name")).to eq("Mariana Sales")
    end

    # The front desk writes down what a parent said at the counter, and the sheet says so.
    it "lets the school keep it current, on the record" do
      patch school_path, params: { health_record: { content: "Alérgica a amendoim e a látex." } },
                         headers: staff_headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "updated_by_name")).to eq(staff_user.email)
    end

    it "does not reach another school's student" do
      other = create(:school)
      other_student = create(:student, school: other)

      get "/api/v1/schools/#{school.id}/people/students/#{other_student.id}/health_record",
          headers: staff_headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "who is refused" do
    it "refuses a staff member without manage_people" do
      plain_staff = create(:user)
      create(:membership, :staff, user: plain_staff, school: school)

      get school_path, headers: auth_headers_for(plain_staff)

      expect(response).to have_http_status(:forbidden).or have_http_status(:not_found)
    end

    it "refuses an unauthenticated caller" do
      get school_path

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
