# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::Documents", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let!(:linked_student) { create(:student, school: school, name: "Linked Child") }
  let!(:unlinked_student) { create(:student, school: school, name: "Other Family Child") }
  let!(:student_guardian_link) do
    create(:student_guardian, school: school, student: linked_student, guardian: guardian)
  end
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/me/documents" do
    parameter name: :school_id, in: :path, type: :integer

    get "List family documents" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

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
    end
  end
end
