# frozen_string_literal: true

require "rails_helper"

# BR-CP04: the school's own compliance files live in `documents` next to family files, so every
# existing document surface has to keep them apart. Plain request specs (not rswag) because they
# exercise the archive and "Meus documentos" endpoints, whose contract is documented elsewhere.
RSpec.describe "Compliance documents isolation", type: :request do
  let(:school) { create(:school) }
  let(:admin) { create(:user) }
  let!(:admin_membership) { create(:membership, :school_admin, user: admin, school: school) }
  let(:mother_user) { create(:user) }
  let!(:mother_membership) { create(:membership, user: mother_user, school: school, role: "guardian") }
  let!(:mother) { create(:guardian, school: school, user: mother_user) }
  let!(:child) { create(:student, school: school) }
  let!(:link) { create(:student_guardian, school: school, student: child, guardian: mother) }
  let!(:child_document) { create(:document, :approved, school: school, documentable: child) }
  let!(:own_document) { create(:document, :approved, school: school, documentable: mother) }
  let!(:compliance) do
    create(:document, :approved, school: school, documentable: school, document_type: "sanitary_inspection")
  end
  let(:pdf) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/sample.pdf"), "application/pdf") }

  def ids
    JSON.parse(response.body).fetch("data").map { |row| row["id"] }
  end

  describe "guardian endpoints" do
    let(:headers) { auth_headers_for(mother_user) }

    it "never lists compliance files in Meus documentos" do
      get "/api/v1/schools/#{school.id}/me/documents", headers: headers

      expect(response).to have_http_status(:ok)
      expect(ids).to contain_exactly(child_document.id, own_document.id)
      expect(ids).not_to include(compliance.id)
    end

    it "keeps the family list clean when a school-level file has the same id as the child" do
      # Polymorphic ids collide freely across owner types; the owner type must decide.
      compliance.update_columns(documentable_id: child.id)

      get "/api/v1/schools/#{school.id}/me/documents", headers: headers

      expect(ids).to contain_exactly(child_document.id, own_document.id)
    end

    it "is refused the staff list even when asking for school-owned files" do
      get "/api/v1/schools/#{school.id}/documents",
          params: { documentable_type: "School", documentable_id: school.id }, headers: headers

      expect(response).to have_http_status(:forbidden)
    end

    it "is refused the compliance endpoints" do
      get "/api/v1/schools/#{school.id}/compliance_documents/#{compliance.id}", headers: headers

      expect(response).to have_http_status(:forbidden)
    end

    it "cannot read a compliance file through the policy" do
      Current.user = mother_user
      Current.school = school
      Current.membership = mother_membership
      Current.guardian = mother

      expect(DocumentPolicy.new(mother_user, compliance).show?).to be(false)
      expect(DocumentPolicy::Scope.new(mother_user, Document).resolve).to contain_exactly(child_document, own_document)
    ensure
      Current.reset
    end
  end

  describe "staff archive endpoints" do
    let(:headers) { auth_headers_for(admin) }

    it "does not turn a guardian_id query into a way to reach school files" do
      get "/api/v1/schools/#{school.id}/documents", params: { guardian_id: mother.id }, headers: headers

      expect(ids).to contain_exactly(own_document.id, child_document.id)
    end

    it "refuses a compliance type filed under a student" do
      post "/api/v1/schools/#{school.id}/documents", headers: headers, params: {
        document: { documentable_type: "Student", documentable_id: child.id,
                    document_type: "pest_control", file: pdf }
      }

      expect(response).to have_http_status(:unprocessable_content)
      expect(JSON.parse(response.body).dig("error", "details")).to have_key("documentable_type")
    end

    it "refuses a compliance type filed under a guardian" do
      post "/api/v1/schools/#{school.id}/documents", headers: headers, params: {
        document: { documentable_type: "Guardian", documentable_id: mother.id,
                    document_type: "fire_department_certificate", file: pdf }
      }

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "accepts a compliance type when the school is the owner" do
      post "/api/v1/schools/#{school.id}/documents", headers: headers, params: {
        document: { documentable_type: "School", documentable_id: school.id,
                    document_type: "pest_control", file: pdf }
      }

      expect(response).to have_http_status(:created)
    end

    it "refuses to retype a guardian's file into a compliance type" do
      patch "/api/v1/schools/#{school.id}/documents/#{own_document.id}", headers: headers,
                                                                          params: { document: { document_type: "pest_control" } }

      expect(response).to have_http_status(:unprocessable_content)
      expect(own_document.reload.document_type).not_to eq("pest_control")
    end
  end
end
