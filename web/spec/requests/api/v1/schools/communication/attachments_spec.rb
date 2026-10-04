# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::Attachments", type: :request do
  let(:school) { create(:school) }
  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
  let(:headers) { auth_headers_for(teacher_user) }
  let(:base) { "/api/v1/schools/#{school.id}/communication/attachments" }

  path "/api/v1/schools/{school_id}/communication/attachments" do
    parameter name: :school_id, in: :path, type: :integer

    post "Upload a file for a later message" do
      tags "Communication"
      consumes "multipart/form-data"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :file, in: :formData, type: :string, format: :binary, required: true

      response "201", "tiny jpeg" do
        let(:file) { uploaded_bytes("\xFF\xD8\xFF\xD9".b, "image/jpeg", ".jpg") }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["content_type"]).to eq("image/jpeg")
          expect(body["byte_size"]).to eq(4)
          expect(body["id"]).to be_present
        end
      end

      response "422", "plain text is not an allowed type" do
        let(:file) { uploaded_bytes("hello", "text/plain", ".txt") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("unsupported_media_type")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/communication/attachments/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Redirect to the blob" do
      tags "Communication"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "302", "uploader is redirected to the blob" do
        let(:id) { uploaded_attachment_id }

        run_test! do |response|
          expect(response).to have_http_status(:found)
          expect(response.location).to be_present
        end
      end

      response "404", "another school cannot read the file" do
        let(:other_school) { create(:school) }
        let(:other_user) { create(:user, email: "other-teacher@example.com") }
        let(:school_id) { other_school.id }
        let(:Authorization) { auth_headers_for(other_user)["Authorization"] }
        let(:id) { uploaded_attachment_id }

        before do
          create(:membership, user: other_user, school: other_school, role: "teacher")
          create(:teacher, school: other_school, email: "other-teacher@example.com")
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end
    end
  end

  def uploaded_attachment_id
    post base, params: { file: uploaded_bytes("\xFF\xD8\xFF\xD9".b, "image/jpeg", ".jpg") }, headers: headers
    response.parsed_body.dig("data", "id")
  end

  def uploaded_bytes(bytes, content_type, extension)
    file = Tempfile.new([ "upload", extension ])
    file.binmode
    file.write(bytes)
    file.rewind
    Rack::Test::UploadedFile.new(file.path, content_type, true)
  end
end
