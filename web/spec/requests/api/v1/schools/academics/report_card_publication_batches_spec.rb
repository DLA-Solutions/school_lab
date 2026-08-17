# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Academics::ReportCardPublicationBatches", type: :request do
  include PermissionsFactoryHelpers

  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  let(:school_year) { create(:school_year, :custom, school: school) }
  let(:period) do
    create(:academic_period, school_year: school_year, school: school, closure_status: "closing")
  end
  let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
  let(:subject_record) { create(:subject, school: school, name: "Matemática") }
  let!(:class_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: subject_record,
                              school_year: school_year)
  end
  let!(:student) { create(:student, school: school, school_class: school_class, name: "Ana Souza") }
  let!(:signatory) { create(:document_signatory, school: school) }
  let!(:config) do
    create(:report_card_config, school: school, document_signatory: signatory,
                                created_by_membership: owner_membership, version: 1)
  end

  def seed_grades_and_attendance!
    template = create(
      :evaluation_template,
      school: school,
      school_class: school_class,
      academic_period: period,
      created_by_membership: owner_membership
    )
    component = create(
      :evaluation_component,
      school: school,
      evaluation_template: template,
      class_discipline: class_discipline,
      grade_scale: create(:grade_scale, school: school)
    )
    create(
      :grade_entry,
      school: school,
      student: student,
      class_discipline: class_discipline,
      academic_period: period,
      evaluation_component: component,
      entered_by_membership: owner_membership,
      value: "8.5"
    )
    Grades::LaunchGradesService.call(
      class_discipline: class_discipline,
      academic_period: period,
      launched_by_membership: owner_membership
    )

    session = create(
      :attendance_session,
      school: school,
      school_class: school_class,
      academic_period: period,
      school_year: school_year,
      session_date: period.starts_on,
      confirmed_at: Time.current
    )
    create(
      :attendance_record,
      attendance_session: session,
      student: student,
      status: "present"
    )
  end

  path "/api/v1/schools/{school_id}/academics/report_card_publication_batches/validate" do
    parameter name: :school_id, in: :path, type: :integer

    post "Validate report card batch readiness" do
      tags "Report Cards", "Academic"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          report_card_publication_batch: {
            type: :object,
            properties: {
              class_id: { type: :integer },
              academic_period_id: { type: :integer }
            },
            required: %w[class_id academic_period_id]
          }
        }
      }

      let(:payload) do
        {
          report_card_publication_batch: {
            class_id: school_class.id,
            academic_period_id: period.id
          }
        }
      end

      response "200", "ready when prerequisites met" do
        before { seed_grades_and_attendance! }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "ready")).to be(true)
        end
      end

      response "422", "not ready when grade launch missing" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("report_card_not_ready")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/academics/report_card_publication_batches" do
    parameter name: :school_id, in: :path, type: :integer

    post "Publish report cards for a class" do
      tags "Report Cards", "Academic"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          report_card_publication_batch: {
            type: :object,
            properties: {
              class_id: { type: :integer },
              academic_period_id: { type: :integer },
              scheduled_for: { type: :string, nullable: true }
            },
            required: %w[class_id academic_period_id]
          }
        }
      }

      let(:payload) do
        {
          report_card_publication_batch: {
            class_id: school_class.id,
            academic_period_id: period.id,
            scheduled_for: nil
          }
        }
      end

      response "201", "atomic immediate publish" do
        before { seed_grades_and_attendance! }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "status")).to eq("completed")
          expect(body.dig("data", "results").size).to eq(1)
          expect(body.dig("data", "results", 0, "snapshot_id")).to be_present
        end
      end

      response "422", "batch fails when attendance pending" do
        before do
          seed_grades_and_attendance!
          create(
            :attendance_session,
            school: school,
            school_class: school_class,
            academic_period: period,
            school_year: school_year,
            session_date: period.starts_on + 1.day,
            confirmed_at: nil
          )
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("report_card_not_ready")
        end
      end
    end
  end
end
