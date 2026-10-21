# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::Documents", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Mother Silva") }
  let(:co_guardian_user) { create(:user) }
  let!(:co_guardian_membership) { create(:membership, user: co_guardian_user, school: school, role: "guardian") }
  let!(:co_guardian) { create(:guardian, school: school, user: co_guardian_user) }
  let!(:linked_student) { create(:student, school: school, name: "Linked Child") }
  let!(:unlinked_student) { create(:student, school: school, name: "Other Family Child") }
  let!(:student_guardian_link) do
    create(:student_guardian, school: school, student: linked_student, guardian: guardian)
  end
  let!(:co_guardian_link) do
    create(:student_guardian, school: school, student: linked_student, guardian: co_guardian)
  end
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
  let(:pdf) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/sample.pdf"), "application/pdf") }

  path "/api/v1/schools/{school_id}/me/documents" do
    parameter name: :school_id, in: :path, type: :integer

    get "List family documents" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :student_id, in: :query, type: :integer, required: false

      # The signed copy of a contract is filed by the system once the provider returns it, so it
      # has no uploader and no review. Every guardian linked to the child sees it.
      context "with a signed contract filed for the child" do
        let(:document_url) { "https://api.autentique.com.br/documentos/abc123/assinado.pdf" }
        let!(:signature_config) { create(:school_signature_provider, :autentique, school: school) }
        let!(:contract) do
          create(:contract, school: school, student: linked_student, signature_status: "signed",
                            signed_at: 1.hour.ago, signed_document_url: document_url)
        end
        let!(:signed_document) do
          stub_request(:get, document_url).to_return(status: 200, body: "%PDF-1.4 signed bytes")
          Documents::AttachSignedContractService.call(contract: contract).data
        end

        response "200", "the guardian sees the signed contract as a system-generated, approved document" do
          run_test! do |response|
            row = JSON.parse(response.body).fetch("data").find { |item| item["id"] == signed_document.id }

            expect(row).to include(
              "document_type" => "signed_contract",
              "status" => "approved",
              "documentable_type" => "Student",
              "student_id" => linked_student.id,
              "student_name" => "Linked Child",
              "content_type" => "application/pdf",
              "uploaded_by_kind" => nil,
              "uploaded_by_name" => nil
            )
            expect(row.fetch("filename")).to eq("contrato-assinado-linked-child.pdf")
            expect(row.fetch("file_url")).to be_present
          end
        end

        response "200", "the co-guardian of the same child sees it too" do
          let(:Authorization) { auth_headers_for(co_guardian_user)["Authorization"] }

          run_test! do |response|
            ids = JSON.parse(response.body).fetch("data").map { |row| row["id"] }
            expect(ids).to contain_exactly(signed_document.id)
          end
        end

        response "200", "a guardian of another family in the same school does not see it" do
          let(:stranger_user) { create(:user) }
          let!(:stranger_membership) { create(:membership, user: stranger_user, school: school, role: "guardian") }
          let!(:stranger) { create(:guardian, school: school, user: stranger_user) }
          let!(:stranger_link) { create(:student_guardian, school: school, student: unlinked_student, guardian: stranger) }
          let(:Authorization) { auth_headers_for(stranger_user)["Authorization"] }

          run_test! do |response|
            expect(JSON.parse(response.body).fetch("data")).to be_empty
          end
        end

        response "404", "a guardian of another school cannot reach it" do
          let(:other_school) { create(:school) }
          let(:outsider_user) { create(:user) }
          let!(:outsider_membership) { create(:membership, user: outsider_user, school: other_school, role: "guardian") }
          let!(:outsider) { create(:guardian, school: other_school, user: outsider_user) }
          let(:Authorization) { auth_headers_for(outsider_user)["Authorization"] }

          run_test! do |response|
            expect(response.body).not_to include("signed_contract")
          end
        end
      end

      response "200", "linked children documents only" do
        let!(:linked_document) do
          create(:document, :approved, school: school, documentable: linked_student)
        end
        let!(:unlinked_document) do
          create(:document, :approved, school: school, documentable: unlinked_student)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          ids = body.fetch("data").map { |row| row["id"] }
          expect(ids).to contain_exactly(linked_document.id)
          expect(ids).not_to include(unlinked_document.id)
        end
      end

      response "200", "shows the child and who sent each document" do
        let!(:from_mother) do
          create(:document, school: school, documentable: linked_student, uploaded_by: guardian_user,
                            document_type: "address_proof")
        end
        let!(:from_staff) do
          create(:document, :approved, school: school, documentable: linked_student,
                                       uploaded_by: create(:user))
        end

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data").index_by { |row| row["id"] }
          mine = rows.fetch(from_mother.id)
          expect(mine).to include(
            "document_type" => "address_proof", "status" => "pending", "student_id" => linked_student.id,
            "student_name" => "Linked Child", "uploaded_by_name" => "Mother Silva",
            "uploaded_by_kind" => "guardian"
          )
          expect(mine["file_url"]).to be_present
          expect(mine["created_at"]).to be_present
          expect(rows.fetch(from_staff.id)).to include("uploaded_by_name" => nil, "uploaded_by_kind" => "school")
        end
      end

      response "200", "the other parent sees what the first parent sent" do
        let(:Authorization) { auth_headers_for(co_guardian_user)["Authorization"] }
        let!(:from_mother) do
          create(:document, school: school, documentable: linked_student, uploaded_by: guardian_user)
        end

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          expect(rows.map { |r| r["id"] }).to contain_exactly(from_mother.id)
          expect(rows.first["file_url"]).to be_present
        end
      end

      response "200", "a guardian not linked to the child does not see the document" do
        let(:stranger_user) { create(:user) }
        let!(:stranger_membership) { create(:membership, user: stranger_user, school: school, role: "guardian") }
        let!(:stranger) { create(:guardian, school: school, user: stranger_user) }
        let(:Authorization) { auth_headers_for(stranger_user)["Authorization"] }
        let!(:from_mother) do
          create(:document, school: school, documentable: linked_student, uploaded_by: guardian_user)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).fetch("data")).to be_empty
        end
      end

      response "200", "filters by child" do
        let!(:second_student) { create(:student, school: school) }
        let!(:second_link) { create(:student_guardian, school: school, student: second_student, guardian: guardian) }
        let!(:first_doc) { create(:document, school: school, documentable: linked_student) }
        let!(:second_doc) { create(:document, school: school, documentable: second_student) }
        let(:student_id) { second_student.id }

        run_test! do |response|
          ids = JSON.parse(response.body).fetch("data").map { |r| r["id"] }
          expect(ids).to contain_exactly(second_doc.id)
        end
      end

      response "404", "filter by a child outside the family" do
        let(:student_id) { unlinked_student.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end
    end

    post "Upload a family document" do
      tags "Guardian Me"
      consumes "multipart/form-data"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :student_id, in: :formData, type: :integer, required: true
      parameter name: :document_type, in: :formData, type: :string, required: true,
                enum: Document::GUARDIAN_DOCUMENT_TYPES
      parameter name: :file, in: :formData, type: :string, format: :binary, required: true

      let(:student_id) { linked_student.id }
      let(:document_type) { "address_proof" }
      let(:file) { pdf }

      Document::GUARDIAN_DOCUMENT_TYPES.each do |type|
        response "201", "accepts #{type}" do
          let(:document_type) { type }

          run_test! do |response|
            data = JSON.parse(response.body).fetch("data")
            expect(data).to include(
              "document_type" => type, "status" => "pending", "documentable_type" => "Student",
              "documentable_id" => linked_student.id, "student_id" => linked_student.id,
              "student_name" => "Linked Child", "uploaded_by_name" => "Mother Silva",
              "uploaded_by_kind" => "guardian", "filename" => "sample.pdf"
            )
            expect(data["file_url"]).to be_present

            document = Document.find(data["id"])
            expect(document.documentable).to eq(linked_student)
            expect(document.uploaded_by).to eq(guardian_user)
            expect(document.school).to eq(school)
          end
        end
      end

      response "201", "the other parent lists and can open the document" do
        run_test! do |created_response|
          created = JSON.parse(created_response.body).fetch("data")

          get "/api/v1/schools/#{school.id}/me/documents", headers: auth_headers_for(co_guardian_user)
          row = JSON.parse(response.body).fetch("data").find { |r| r["id"] == created["id"] }
          expect(row).to include("status" => "pending", "uploaded_by_name" => "Mother Silva")

          get row["file_url"]
          expect(response).to have_http_status(:redirect)
        end
      end

      response "201", "accepts a PNG image" do
        let(:file) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/photo.png"), "image/png") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "content_type")).to eq("image/png")
        end
      end

      response "404", "child linked to another family" do
        let(:student_id) { unlinked_student.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
          expect(Document.count).to eq(0)
        end
      end

      response "404", "child of another school" do
        let(:student_id) { create(:student).id }

        run_test! do
          expect(Document.count).to eq(0)
        end
      end

      response "404", "child whose link to this guardian was discarded" do
        before { student_guardian_link.discard }

        run_test! do
          expect(Document.count).to eq(0)
        end
      end

      response "422", "document type outside the guardian list" do
        let(:document_type) { "birth_certificate" }

        run_test! do |response|
          error = JSON.parse(response.body).fetch("error")
          expect(error["code"]).to eq("validation_error")
          expect(error["details"]).to have_key("document_type")
          expect(Document.count).to eq(0)
        end
      end

      response "422", "a near-miss spelling of a new type" do
        let(:document_type) { "school_transcripts" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("document_type")
          expect(Document.count).to eq(0)
        end
      end

      response "422", "child no longer enrolled" do
        before { linked_student.update!(status: "transferred") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("student_inactive")
          expect(Document.count).to eq(0)
        end
      end

      response "422", "missing file" do
        let(:file) { nil }

        run_test! do |response|
          error = JSON.parse(response.body).fetch("error")
          expect(error["code"]).to eq("validation_error")
          expect(error["details"]).to have_key("file")
          expect(Document.count).to eq(0)
        end
      end

      response "422", "file type not allowed" do
        let(:file) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/note.txt"), "application/pdf") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("unsupported_media_type")
          expect(Document.count).to eq(0)
        end
      end

      response "422", "file larger than 10 MB" do
        let(:file) do
          big = Tempfile.new([ "big", ".pdf" ])
          big.binmode
          big.write("%PDF-1.4\n#{'0' * (Documents::CreateGuardianDocumentService::MAX_FILE_BYTES + 1)}")
          big.flush
          Rack::Test::UploadedFile.new(big.path, "application/pdf")
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("file_too_large")
          expect(Document.count).to eq(0)
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "staff member cannot use the guardian endpoint" do
        let(:staff_user) { create(:user) }
        let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do
          expect(Document.count).to eq(0)
        end
      end
    end
  end
end
