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

    get "List documents" do
      tags "Documents"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :documentable_type, in: :query, type: :string, required: false
      parameter name: :documentable_id, in: :query, type: :integer, required: false
      parameter name: :guardian_id, in: :query, type: :integer, required: false,
                description: "Everything about one guardian: their own files plus those of linked children. " \
                             "Cannot be combined with documentable_type/documentable_id. Rows carry " \
                             "student_id, student_name, uploaded_by_name and uploaded_by_kind."

      let(:mother_user) { create(:user) }
      let!(:mother) { create(:guardian, school: school, user: mother_user, name: "Mother Silva") }
      let!(:child) { create(:student, school: school, name: "Linked Child") }
      let!(:link) { create(:student_guardian, school: school, student: child, guardian: mother) }
      let!(:own_document) do
        create(:document, school: school, documentable: mother, document_type: "identity",
                          uploaded_by: school_admin)
      end
      let!(:child_document) do
        create(:document, school: school, documentable: child, document_type: "guardian_identity",
                          uploaded_by: mother_user)
      end
      let!(:stranger_document) do
        create(:document, school: school, documentable: create(:student, school: school))
      end
      let(:guardian_id) { nil }
      let(:documentable_type) { nil }
      let(:documentable_id) { nil }

      response "200", "without guardian_id keeps the shape and the owner filter" do
        let(:documentable_type) { "Guardian" }
        let(:documentable_id) { mother.id }

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          expect(rows.map { |r| r["id"] }).to contain_exactly(own_document.id)
          expect(rows.first).not_to have_key("student_name")
        end
      end

      response "200", "guardian_id returns the guardian's files and those of their children" do
        let(:guardian_id) { mother.id }

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data").index_by { |r| r["id"] }
          expect(rows.keys).to contain_exactly(own_document.id, child_document.id)
          expect(rows.fetch(child_document.id)).to include(
            "document_type" => "guardian_identity", "status" => "pending", "student_id" => child.id,
            "student_name" => "Linked Child", "uploaded_by_name" => "Mother Silva",
            "uploaded_by_kind" => "guardian"
          )
          expect(rows.fetch(child_document.id)["file_url"]).to be_present
          expect(rows.fetch(own_document.id)).to include(
            "student_id" => nil, "student_name" => nil, "uploaded_by_name" => nil, "uploaded_by_kind" => "school"
          )
        end
      end

      response "200", "guardian_id includes a document sent by the other parent" do
        let(:father_user) { create(:user) }
        let!(:father) { create(:guardian, school: school, user: father_user, name: "Father Silva") }
        let!(:father_link) { create(:student_guardian, school: school, student: child, guardian: father) }
        let!(:from_father) do
          create(:document, school: school, documentable: child, document_type: "school_transcript",
                            uploaded_by: father_user)
        end
        let(:guardian_id) { mother.id }

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          row = rows.find { |r| r["id"] == from_father.id }
          expect(row).to include("uploaded_by_name" => "Father Silva", "student_name" => "Linked Child")
        end
      end

      response "200", "guardian_id skips children whose link was discarded or who were discarded" do
        let!(:second_child) { create(:student, school: school) }
        let!(:second_link) { create(:student_guardian, school: school, student: second_child, guardian: mother) }
        let!(:discarded_child) { create(:student, school: school) }
        let!(:discarded_child_link) do
          create(:student_guardian, school: school, student: discarded_child, guardian: mother)
        end
        let!(:unlinked_doc) { create(:document, school: school, documentable: second_child) }
        let!(:discarded_child_doc) { create(:document, school: school, documentable: discarded_child) }
        let(:guardian_id) { mother.id }

        before do
          second_link.discard
          discarded_child.discard
        end

        run_test! do |response|
          ids = JSON.parse(response.body).fetch("data").map { |r| r["id"] }
          expect(ids).to contain_exactly(own_document.id, child_document.id)
        end
      end

      response "200", "guardian_id leaves out discarded documents" do
        let(:guardian_id) { mother.id }

        before { child_document.discard }

        run_test! do |response|
          ids = JSON.parse(response.body).fetch("data").map { |r| r["id"] }
          expect(ids).to contain_exactly(own_document.id)
        end
      end

      response "200", "a guardian from another school matches nothing" do
        let(:other_school) { create(:school) }
        let!(:foreign_guardian) { create(:guardian, school: other_school) }
        let!(:foreign_student) { create(:student, school: other_school) }
        let!(:foreign_link) do
          create(:student_guardian, school: other_school, student: foreign_student, guardian: foreign_guardian)
        end
        let!(:foreign_document) do
          create(:document, school: other_school, documentable: foreign_student)
        end
        let(:guardian_id) { foreign_guardian.id }

        run_test! do |response|
          expect(JSON.parse(response.body).fetch("data")).to be_empty
        end
      end

      response "200", "an unknown guardian_id matches nothing" do
        let(:guardian_id) { 0 }

        run_test! do |response|
          expect(JSON.parse(response.body).fetch("data")).to be_empty
        end
      end

      response "422", "guardian_id cannot be combined with the owner filter" do
        let(:guardian_id) { mother.id }
        let(:documentable_type) { "Student" }
        let(:documentable_id) { child.id }

        run_test! do |response|
          error = JSON.parse(response.body).fetch("error")
          expect(error["code"]).to eq("validation_error")
          expect(error["details"]).to have_key("guardian_id")
        end
      end

      response "403", "guardians cannot use the staff list" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
        let(:guardian_id) { mother.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end
    end

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

  path "/api/v1/schools/{school_id}/documents/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    delete "Discard document" do
      tags "Documents"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "staff discards a document a parent sent for a child" do
        let(:parent_user) { create(:user) }
        let!(:document) do
          create(:document, school: school, documentable: student, document_type: "guardian_identity",
                            uploaded_by: parent_user)
        end
        let(:id) { document.id }

        run_test! do
          expect(document.reload).to be_discarded
        end
      end

      response "404", "document of another school" do
        let!(:document) { create(:document) }
        let(:id) { document.id }

        run_test! do
          expect(document.reload).not_to be_discarded
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
