# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::Messages", type: :request do
  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let!(:ana) { create(:student, school: school, school_class: school_class, name: "Ana Costa") }
  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }
  let(:maths) { create(:subject, school: school) }
  let(:school_id) { school.id }
  let(:student_id) { ana.id }
  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
  let(:headers) { auth_headers_for(teacher_user) }
  let(:messages_path) { "/api/v1/schools/#{school.id}/communication/conversations/#{ana.id}/messages" }

  before do
    create(:teaching_assignment, school: school, teacher: carla, school_class: school_class, subject: maths)
  end

  path "/api/v1/schools/{school_id}/communication/conversations/{student_id}/messages" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :student_id, in: :path, type: :integer

    get "List messages on a child's thread" do
      tags "Communication"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "empty page when no thread exists yet" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.fetch("data")).to eq([])
          expect(body.dig("meta", "total")).to eq(0)
          expect(Conversation.kept.where(student_id: ana.id)).to be_empty
        end
      end
    end

    post "Send a message on a child's thread" do
      tags "Communication"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          body: { type: :string },
          attachment_ids: { type: :array, items: { type: :integer } },
          client_request_id: { type: :string }
        }
      }

      response "201", "text message, reusing the same thread on the next send" do
        let(:payload) { { body: "Segue a foto da rodinha." } }

        run_test! do
          first = response.parsed_body.fetch("data")
          expect(first["body"]).to eq("Segue a foto da rodinha.")
          expect(first["kind"]).to eq("text")
          expect(first["conversation_id"]).to be_present
          expect(first["daily_routine_id"]).to be_nil
          expect(first["attachment_ids"]).to eq([])

          post messages_path, params: { body: "E a tarefa de casa." }, headers: headers, as: :json

          expect(response).to have_http_status(:created)
          second = response.parsed_body.fetch("data")
          expect(second["conversation_id"]).to eq(first["conversation_id"])
          expect(Conversation.kept.where(student_id: ana.id).count).to eq(1)
          expect(Message.where(conversation_id: first["conversation_id"]).count).to eq(2)
        end
      end

      response "422", "empty content" do
        let(:payload) { { body: "   " } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("empty_content")
          expect(Message.count).to eq(0)
        end
      end

      response "200", "same client_request_id does not insert again" do
        let(:client_request_id) { "4f1c0c3e-7b2a-4d1e-9a55-0c1e8b7a6d10" }
        let(:payload) { { body: "Bom dia.", client_request_id: client_request_id } }

        before do
          post messages_path, params: payload, headers: headers, as: :json
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["body"]).to eq("Bom dia.")
          expect(Message.where(client_request_id: client_request_id).count).to eq(1)
        end
      end
    end
  end

  it "does not route message edits or deletes" do
    [
      "/api/v1/schools/1/communication/conversations/1/messages",
      "/api/v1/schools/1/communication/conversations/1/messages/1",
      "/api/v1/schools/1/me/conversations/1/messages",
      "/api/v1/schools/1/me/conversations/1/messages/1"
    ].each do |path|
      expect { Rails.application.routes.recognize_path(path, method: :patch) }
        .to raise_error(ActionController::RoutingError)
      expect { Rails.application.routes.recognize_path(path, method: :delete) }
        .to raise_error(ActionController::RoutingError)
    end
  end
end
