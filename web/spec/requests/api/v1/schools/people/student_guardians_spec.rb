# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::People::StudentGuardians", type: :request do
  let(:school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

  path "/api/v1/schools/{school_id}/people/students/{student_id}/guardians" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :student_id, in: :path, type: :integer

    post "Link guardian to student" do
      tags "People"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          student_guardian: {
            type: :object,
            properties: {
              guardian_id: { type: :integer },
              financial_percentage: { type: :number },
              primary_guardian: { type: :boolean }
            },
            required: %w[guardian_id]
          }
        },
        required: %w[student_guardian]
      }

      response "201", "student_guardian link created" do
        let!(:student) { create(:student, school: school) }
        let!(:guardian) { create(:guardian, school: school) }
        let(:student_id) { student.id }
        let(:payload) do
          {
            student_guardian: {
              guardian_id: guardian.id,
              financial_percentage: 50,
              primary_guardian: true
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "financial_percentage").to_f).to eq(50.0)
          link = StudentGuardian.kept.find_by(student: student, guardian: guardian)
          expect(link.financial_percentage.to_f).to eq(50.0)
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/people/student_guardians/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    delete "Unlink guardian from student" do
      tags "People"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "link discarded" do
        let!(:link) { create(:student_guardian, school: school) }
        let(:id) { link.id }

        run_test! do
          expect(link.reload).to be_discarded
        end
      end
    end
  end
end
