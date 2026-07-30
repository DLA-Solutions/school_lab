# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::Students", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let!(:student_st1) { create(:student, school: school, name: "Linked Child") }
  let!(:student_st2) { create(:student, school: school, name: "Unlinked Child") }
  let!(:student_guardian_link) do
    create(:student_guardian, school: school, student: student_st1, guardian: guardian)
  end
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/me/students" do
    parameter name: :school_id, in: :path, type: :integer

    get "List linked children" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "linked children only" do
        run_test! do |response|
          body = JSON.parse(response.body)
          ids = body.fetch("data").map { |row| row["id"] }
          expect(ids).to contain_exactly(student_st1.id)
          expect(ids).not_to include(student_st2.id)
        end
      end
    end
  end
end
