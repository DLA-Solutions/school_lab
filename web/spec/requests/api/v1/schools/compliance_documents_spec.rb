# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::ComplianceDocuments", type: :request do
  let(:school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }
  let(:pdf) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/sample.pdf"), "application/pdf") }

  def compliance_document(type: "pest_control", owner: school, created_at: Time.current, **attrs)
    document = create(:document, :approved, school: owner, documentable: owner, document_type: type,
                                 uploaded_by: school_admin, **attrs)
    document.update_columns(created_at: created_at)
    document
  end

  path "/api/v1/schools/{school_id}/compliance_documents" do
    parameter name: :school_id, in: :path, type: :integer

    get "List compliance documents" do
      tags "Compliance"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :document_type, in: :query, type: :string, required: false,
                description: "One of the catalog keys returned in meta.types"
      parameter name: :page, in: :query, type: :integer, required: false
      parameter name: "Accept-Language", in: :header, type: :string, required: false

      let(:document_type) { nil }
      let(:"Accept-Language") { nil }
      let!(:old_pest) { compliance_document(type: "pest_control", created_at: 2.days.ago) }
      let!(:new_pest) { compliance_document(type: "pest_control", created_at: 1.hour.ago) }
      let!(:fire) { compliance_document(type: "fire_department_certificate") }

      response "200", "lists kept compliance files newest first, with the catalog in meta" do
        schema type: :object,
               required: %w[data meta],
               properties: {
                 data: { type: :array },
                 meta: {
                   type: :object,
                   properties: {
                     page: { type: :integer }, per_page: { type: :integer }, total: { type: :integer },
                     types: { type: :array, items: { type: :object, properties: {
                       key: { type: :string }, label: { type: :string }
                     } } }
                   }
                 }
               }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["data"].map { |r| r["id"] }).to eq([ fire.id, new_pest.id, old_pest.id ])
          expect(body["data"].first).to include(
            "document_type" => "fire_department_certificate",
            "document_type_label" => "Certificado dos bombeiros",
            "status" => "approved", "filename" => "sample.pdf", "content_type" => "application/pdf",
            "uploaded_by_id" => school_admin.id
          )
          expect(body["data"].first["file_url"]).to be_present
          expect(body["meta"]).to include("page" => 1, "total" => 3)
          expect(body["meta"]["types"].map { |t| t["key"] }).to eq(Document::COMPLIANCE_DOCUMENT_TYPES)
          expect(body["meta"]["types"].first).to eq(
            "key" => "sanitary_inspection", "label" => "Vigilância sanitária"
          )
        end
      end

      response "200", "filters by document_type and keeps the full catalog in meta" do
        let(:document_type) { "pest_control" }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["data"].map { |r| r["id"] }).to eq([ new_pest.id, old_pest.id ])
          expect(body["meta"]["types"].size).to eq(7)
        end
      end

      response "200", "never lists discarded files, other schools, students or non-catalog types" do
        let!(:discarded) { compliance_document(type: "pest_control", discarded_at: Time.current) }
        let!(:foreign) { compliance_document(type: "pest_control", owner: create(:school)) }
        let!(:student_file) do
          create(:document, school: school, documentable: create(:student, school: school),
                            document_type: "birth_certificate")
        end
        let!(:free_form_school_file) do
          create(:document, school: school, documentable: school, document_type: "lease_agreement")
        end

        run_test! do |response|
          ids = JSON.parse(response.body)["data"].map { |r| r["id"] }
          expect(ids).to contain_exactly(fire.id, new_pest.id, old_pest.id)
        end
      end

      response "200", "answers in English when asked" do
        let(:"Accept-Language") { "en" }

        run_test! do |response|
          label = JSON.parse(response.body).dig("meta", "types", 0, "label")
          expect(label).to eq("Health inspection")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "guardian" do
        let(:guardian_user) { create(:user) }
        let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
        let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "staff without manage_documents" do
        let(:teacher_user) { create(:user) }
        let!(:teacher_membership) { create(:membership, :staff, user: teacher_user, school: school) }
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "documents module disabled for the school" do
        before { create(:school_module, school: school, module_key: "documents", enabled: false) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("module_disabled")
        end
      end

      response "404", "school the user does not belong to" do
        let(:school_id) { create(:school).id }

        run_test!
      end
    end

    post "Upload a compliance document" do
      tags "Compliance"
      consumes "multipart/form-data"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :document_type, in: :formData, type: :string, required: true
      parameter name: :file, in: :formData, type: :string, format: :binary, required: true
      parameter name: :title, in: :formData, type: :string, required: false,
                description: "Accepted and ignored: documents has no title column"

      let(:document_type) { "water_tank_cleaning" }
      let(:file) { pdf }

      response "201", "stored as an approved School document" do
        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data).to include(
            "document_type" => "water_tank_cleaning", "document_type_label" => "Limpeza da caixa d'água",
            "status" => "approved", "filename" => "sample.pdf", "uploaded_by_id" => school_admin.id
          )
          expect(data["file_url"]).to be_present

          document = Document.find(data["id"])
          expect(document).to have_attributes(
            school_id: school.id, documentable_type: "School", documentable_id: school.id,
            status: "approved", uploaded_by_id: school_admin.id
          )
          expect(document.audits.pluck(:action)).to include("create")
        end
      end

      response "201", "a second upload under the same type keeps the first" do
        let!(:first_upload) { compliance_document(type: "water_tank_cleaning", created_at: 1.day.ago) }

        run_test! do
          expect(Document.compliance.where(school_id: school.id, document_type: "water_tank_cleaning").count).to eq(2)
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "guardian" do
        let(:guardian_user) { create(:user) }
        let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
        let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do
          expect(Document.count).to eq(0)
        end
      end

      response "404", "school the user does not belong to" do
        let(:school_id) { create(:school).id }

        run_test! do
          expect(Document.count).to eq(0)
        end
      end

      response "422", "unknown document_type" do
        let(:document_type) { "alvara" }

        run_test! do |response|
          error = JSON.parse(response.body).fetch("error")
          expect(error["code"]).to eq("validation_error")
          expect(error["details"]).to have_key("document_type")
          expect(Document.count).to eq(0)
        end
      end

      response "422", "missing file" do
        let(:file) { nil }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("file")
          expect(Document.count).to eq(0)
        end
      end

      response "422", "file that is not a PDF or image" do
        let(:file) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/note.txt"), "application/pdf") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("unsupported_media_type")
          expect(Document.count).to eq(0)
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/compliance_documents/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    let!(:document) { compliance_document(type: "first_aid_certificate") }
    let(:id) { document.id }

    get "Show a compliance document" do
      tags "Compliance"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns metadata and the file URL" do
        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data).to include("id" => document.id, "document_type" => "first_aid_certificate",
                                  "document_type_label" => "Certificado de primeiros socorros")
          expect(data["file_url"]).to be_present
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "guardian" do
        let(:guardian_user) { create(:user) }
        let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
        let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test!
      end

      response "404", "file of another school" do
        let!(:foreign) { compliance_document(owner: create(:school)) }
        let(:id) { foreign.id }

        run_test!
      end

      response "404", "same id through another school's route" do
        let(:other_admin) { create(:user) }
        let(:other_school) { create(:school) }
        let!(:other_membership) { create(:membership, :school_admin, user: other_admin, school: other_school) }
        let(:school_id) { other_school.id }
        let(:Authorization) { auth_headers_for(other_admin)["Authorization"] }

        run_test!
      end

      response "404", "a student's file is not a compliance file" do
        let!(:student_file) do
          create(:document, school: school, documentable: create(:student, school: school))
        end
        let(:id) { student_file.id }

        run_test!
      end

      response "404", "discarded file" do
        before { document.discard }

        run_test!
      end
    end

    delete "Remove a compliance document" do
      tags "Compliance"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "discards the file and records who did it" do
        run_test! do
          expect(document.reload).to be_discarded
          expect(document.discarded_by).to eq(school_admin)
          expect(Document.where(id: document.id)).to exist
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "guardian" do
        let(:guardian_user) { create(:user) }
        let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
        let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do
          expect(document.reload).not_to be_discarded
        end
      end

      response "404", "file of another school" do
        let!(:foreign) { compliance_document(owner: create(:school)) }
        let(:id) { foreign.id }

        run_test! do
          expect(foreign.reload).not_to be_discarded
        end
      end

      response "404", "already discarded" do
        before { document.discard }

        run_test!
      end
    end
  end
end
