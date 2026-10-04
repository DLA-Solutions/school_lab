# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::Attachments", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/me/attachments" do
    parameter name: :school_id, in: :path, type: :integer

    post "Upload a file for a reply" do
      tags "Guardian Me"
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
        end
      end
    end
  end

  def uploaded_bytes(bytes, content_type, extension)
    file = Tempfile.new([ "upload", extension ])
    file.binmode
    file.write(bytes)
    file.rewind
    Rack::Test::UploadedFile.new(file.path, content_type, true)
  end
end
