# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::Conversations", type: :request do
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
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
  let(:headers) { auth_headers_for(guardian_user) }
  let(:base) { "/api/v1/schools/#{school.id}/me/conversations" }

  path "/api/v1/schools/{school_id}/me/conversations" do
    parameter name: :school_id, in: :path, type: :integer

    get "List threads for linked children" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "only the linked child" do
        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          expect(rows.map { |row| row["student_id"] }).to eq([ ana.id ])
          expect(rows.first["conversation_id"]).to be_nil
        end
      end

      response "403", "a teacher is not a guardian on /me" do
        let(:teacher_user) { create(:user, email: "carla@example.com") }
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        before do
          create(:membership, user: teacher_user, school: school, role: "teacher")
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end
end
