# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::ClassNotices", type: :request do
  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, year: 2026, name: "A") }
  let!(:ana) { create(:student, school: school, school_class: school_class, name: "Ana Costa") }
  let!(:bruno) { create(:student, school: school, school_class: school_class, name: "Bruno Lima") }
  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com") }
  let(:maths) { create(:subject, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
  let(:headers) { auth_headers_for(teacher_user) }
  let(:notices_path) { "/api/v1/schools/#{school.id}/communication/class_notices" }
  let(:client_request_id) { "8a2d1b44-1c09-4e77-9f20-6c5b0a11d2e3" }

  before do
    create(:teaching_assignment, school: school, teacher: carla, school_class: school_class, subject: maths)
  end

  path "/api/v1/schools/{school_id}/communication/class_notices" do
    parameter name: :school_id, in: :path, type: :integer

    post "Copy a notice into each child's thread" do
      tags "Communication"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          school_class_id: { type: :integer },
          body: { type: :string },
          attachment_ids: { type: :array, items: { type: :integer } },
          client_request_id: { type: :string }
        }
      }

      response "201", "one message per active enrolled student" do
        let(:payload) do
          { school_class_id: school_class.id, body: "Amanhã teremos passeio.", client_request_id: client_request_id }
        end

        run_test! do
          messages = response.parsed_body.fetch("data")
          expect(messages.size).to eq(2)
          expect(messages.map { |row| row["kind"] }).to all(eq("text"))
          expect(Conversation.kept.where(student_id: [ ana.id, bruno.id ]).count).to eq(2)
          expect(Message.count).to eq(2)

          post notices_path, params: payload, headers: headers, as: :json

          expect(response).to have_http_status(:ok)
          expect(response.parsed_body.fetch("data").size).to eq(2)
          expect(Message.count).to eq(2)
          expect(Conversation.kept.count).to eq(2)
        end
      end
    end
  end
end
