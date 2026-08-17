# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::ReportCards", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

  let(:school_class) { create(:school_class, school: school) }
  let!(:student) { create(:student, school: school, school_class: school_class) }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }

  let(:period) { create(:academic_period, school: school) }
  let!(:publication) do
    create(:report_card_publication, school: school, student: student, academic_period: period)
  end
  let!(:snapshot) do
    create(
      :report_card_snapshot,
      school: school,
      report_card_publication: publication,
      version: 1,
      released_at: 1.hour.ago
    )
  end

  before do
    publication.update!(active_snapshot: snapshot)
  end

  path "/api/v1/schools/{school_id}/me/report_cards" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :student_id, in: :query, type: :integer, required: false

    get "List guardian report cards" do
      tags "Report Cards", "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns released snapshots for linked student" do
        let(:student_id) { student.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.fetch("data").size).to eq(1)
          expect(body.dig("data", 0, "snapshot_id")).to eq(snapshot.id)
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/me/report_cards/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Show guardian report card" do
      tags "Report Cards", "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      let(:id) { publication.id }

      response "200", "returns active snapshot" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "active_snapshot_id")).to eq(snapshot.id)
        end
      end

      response "404", "cross-family publication hidden" do
        let(:other_guardian_user) { create(:user) }
        let!(:other_guardian_membership) do
          create(:membership, user: other_guardian_user, school: school, role: "guardian")
        end
        let!(:other_guardian) { create(:guardian, school: school, user: other_guardian_user) }
        let(:Authorization) { auth_headers_for(other_guardian_user)["Authorization"] }

        run_test!
      end
    end
  end
end
