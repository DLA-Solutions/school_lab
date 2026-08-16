# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Academics::AcademicPeriods", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:school_year) { create(:school_year, :custom, school: school) }
  let(:period) { create(:academic_period, school_year: school_year, school: school, closure_status: "open") }
  let(:id) { period.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/academics/academic_periods/{id}/start_closure" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Start academic period closure" do
      tags "Academic", "Academic Periods"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "200", "transitions open to closing when checklist passes" do
        let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
        let(:subject_record) { create(:subject, school: school) }
        let!(:class_discipline) do
          create(:class_discipline, school: school, school_class: school_class, subject: subject_record,
                                    school_year: school_year)
        end
        let!(:template) do
          create(
            :evaluation_template,
            school: school,
            school_class: school_class,
            academic_period: period,
            created_by_membership: owner_membership
          )
        end
        let!(:component) do
          create(
            :evaluation_component,
            school: school,
            evaluation_template: template,
            class_discipline: class_discipline,
            grade_scale: create(:grade_scale, school: school)
          )
        end
        let(:student) { create(:student, school: school, school_class: school_class) }

        before do
          create(
            :grade_entry,
            school: school,
            student: student,
            class_discipline: class_discipline,
            academic_period: period,
            evaluation_component: component,
            entered_by_membership: owner_membership,
            value: "8.0"
          )
          Grades::LaunchGradesService.call(
            class_discipline: class_discipline,
            academic_period: period,
            launched_by_membership: owner_membership
          )
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "closure_status")).to eq("closing")
        end
      end

      response "422", "checklist incomplete when grade launch missing" do
        let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
        let(:subject_record) { create(:subject, school: school) }

        before do
          create(:class_discipline, school: school, school_class: school_class, subject: subject_record,
                                    school_year: school_year)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("checklist_incomplete")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/academics/academic_periods/{id}/closure_checklist" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Closure checklist for academic period" do
      tags "Academic", "Academic Periods"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns checklist blockers" do
        let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
        let(:subject_record) { create(:subject, school: school) }

        before do
          create(:class_discipline, school: school, school_class: school_class, subject: subject_record,
                                    school_year: school_year)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "complete")).to be(false)
          expect(body.dig("data", "blockers")).not_to be_empty
        end
      end
    end
  end
end
