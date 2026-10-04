# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::Messages", type: :request do
  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Maria Silva") }
  let!(:ana) { create(:student, school: school, school_class: school_class, name: "Ana Costa") }
  let!(:family) { create(:student_guardian, school: school, student: ana, guardian: guardian) }
  let(:other_guardian) { create(:guardian, school: school, name: "Outra Familia") }
  let!(:zoe) { create(:student, school: school, school_class: school_class, name: "Zoe Dias") }
  let!(:other_family) { create(:student_guardian, school: school, student: zoe, guardian: other_guardian) }
  let(:school_id) { school.id }
  let(:student_id) { ana.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
  let(:headers) { auth_headers_for(guardian_user) }
  let(:messages_path) { "/api/v1/schools/#{school.id}/me/conversations/#{ana.id}/messages" }

  path "/api/v1/schools/{school_id}/me/conversations/{student_id}/messages" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :student_id, in: :path, type: :integer

    get "Read a linked child's thread" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "empty until someone writes" do
        run_test! do |response|
          expect(JSON.parse(response.body).fetch("data")).to eq([])
          expect(Conversation.count).to eq(0)
        end
      end

      response "404", "another family's student is not found" do
        let(:student_id) { zoe.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
          expect(body.dig("error", "code")).not_to eq("family_isolation_violation")
        end
      end
    end

    post "Reply on a linked child's thread" do
      tags "Guardian Me"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          body: { type: :string }
        }
      }

      response "201", "guardian reply" do
        let(:payload) { { body: "Obrigada, recebi." } }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data["body"]).to eq("Obrigada, recebi.")
          expect(data["sender_membership_id"]).to eq(guardian_membership.id)
          expect(Conversation.kept.where(student_id: ana.id).count).to eq(1)
        end
      end

      response "404", "cannot reply on another family's thread" do
        let(:student_id) { zoe.id }
        let(:payload) { { body: "Oi." } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
          expect(body.dig("error", "code")).not_to eq("family_isolation_violation")
          expect(Message.count).to eq(0)
        end
      end
    end
  end
end
