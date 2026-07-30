# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Documents", type: :request do
  let(:school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:student) { create(:student, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }
  let(:sample_file) do
    Rack::Test::UploadedFile.new(
      Rails.root.join("spec/fixtures/files/sample.pdf"),
      "application/pdf"
    )
  end

  path "/api/v1/schools/{school_id}/documents" do
    parameter name: :school_id, in: :path, type: :integer

    post "Upload document" do
      tags "Documents"
      consumes "multipart/form-data"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :"document[documentable_type]", in: :formData, type: :string, required: true
      parameter name: :"document[documentable_id]", in: :formData, type: :integer, required: true
      parameter name: :"document[document_type]", in: :formData, type: :string, required: true
      parameter name: :"document[file]", in: :formData, type: :string, format: :binary, required: true

      response "201", "document uploaded with pending status" do
        let(:"document[documentable_type]") { "Student" }
        let(:"document[documentable_id]") { student.id }
        let(:"document[document_type]") { "birth_certificate" }
        let(:"document[file]") { sample_file }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "status")).to eq("pending")
          expect(body.dig("data", "documentable_type")).to eq("Student")
          expect(body.dig("data", "documentable_id")).to eq(student.id)
          expect(Document.last.status).to eq("pending")
        end
      end

      response "403", "forbidden for guardian role" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
        let(:"document[documentable_type]") { "Student" }
        let(:"document[documentable_id]") { student.id }
        let(:"document[document_type]") { "birth_certificate" }
        let(:"document[file]") { sample_file }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/documents/{id}/approve" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Approve document" do
      tags "Documents"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "pending document approved" do
        let!(:document) { create(:document, school: school, documentable: student, uploaded_by: school_admin) }
        let(:id) { document.id }

        run_test! do
          expect(document.reload.status).to eq("approved")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/documents/{id}/reject" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Reject document" do
      tags "Documents"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          rejection_reason: { type: :string }
        }
      }

      response "422", "rejection requires reason" do
        let!(:document) { create(:document, school: school, documentable: student, uploaded_by: school_admin) }
        let(:id) { document.id }
        let(:payload) { {} }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(document.reload.status).to eq("pending")
        end
      end

      response "200", "pending document rejected with reason" do
        let!(:document) { create(:document, school: school, documentable: student, uploaded_by: school_admin) }
        let(:id) { document.id }
        let(:payload) { { rejection_reason: "Illegible scan" } }

        run_test! do
          expect(document.reload.status).to eq("rejected")
          expect(document.rejection_reason).to eq("Illegible scan")
        end
      end
    end
  end
end
