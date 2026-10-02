# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Academics::GradeBooks", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:school_year) { create(:school_year, :custom, school: school) }
  let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
  let(:subject_record) { create(:subject, school: school) }
  let(:subject_id) { subject_record.id }
  let(:school_class_id) { school_class.id }

  let(:period) { create(:academic_period, school_year: school_year, school: school, closure_status: "open") }

  let!(:class_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: subject_record,
                              school_year: school_year)
  end

  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }

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
      grade_scale: create(:grade_scale, school: school),
      name: "P1",
      position: 1,
      weight_percent: 100
    )
  end

  let(:student) { create(:student, school: school, school_class: school_class) }

  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  # A teacher membership that additionally holds `manage_enrollment` through a custom template —
  # the system `teacher` template only grants `teach`, so grading access is an explicit,
  # school-configured extra permission, narrowed further by `ClassDiscipline#teacher_id`.
  def create_teacher_with_enrollment(assigned_to: nil)
    teacher_user = create(:user)
    membership = create(:membership, user: teacher_user, school: school, role: "teacher")
    teacher = create(:teacher, school: school, email: teacher_user.email)

    custom_template = create(:school_role_template, school: school)
    create(:role_template_permission, school: school, role_template: custom_template,
                                      permission_key: "manage_enrollment", scope_kind: "full")
    create(:staff_profile, membership: membership, school: school, role_template: custom_template)

    assigned_to.update!(teacher: teacher) if assigned_to
    teacher_user
  end

  path "/api/v1/schools/{school_id}/academics/classes/{school_class_id}/grade_book" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :school_class_id, in: :path, type: :integer
    parameter name: :subject_id, in: :query, type: :integer

    get "Read the grade book grid for one class + subject" do
      tags "Academic", "Grades"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "200", "roster, periods (with their own components) and entries" do
        before do
          create(:grade_entry, school: school, student: student, class_discipline: class_discipline,
                               academic_period: period, evaluation_component: component,
                               entered_by_membership: owner_membership, value: "8.5")
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          data = body["data"]

          expect(data["context"]).to include(
            "school_class_id" => school_class.id,
            "subject_id" => subject_record.id,
            "class_discipline_id" => class_discipline.id,
            "year" => school_class.year
          )

          period_payload = data["periods"].first
          expect(period_payload["id"]).to eq(period.id)
          expect(period_payload["closed"]).to be(false)
          expect(period_payload["components"]).to eq(
            [ { "id" => component.id, "name" => "P1", "position" => 1, "weight_percent" => 100.0 } ]
          )

          student_payload = data["students"].find { |s| s["id"] == student.id }
          expect(student_payload["entries"]).to eq(
            { period.id.to_s => { component.id.to_s => 8.5 } }
          )
        end
      end

      response "200", "a non-numeric scale value ships as the raw string" do
        before do
          create(:grade_entry, school: school, student: student, class_discipline: class_discipline,
                               academic_period: period, evaluation_component: component,
                               entered_by_membership: owner_membership, value: "B+")
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          cell = body.dig("data", "students", 0, "entries", period.id.to_s, component.id.to_s)
          expect(cell).to eq("B+")
        end
      end

      response "403", "a teacher not assigned to this class/subject" do
        let(:Authorization) { auth_headers_for(create_teacher_with_enrollment)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "200", "a teacher assigned to this class/subject" do
        let(:Authorization) { auth_headers_for(create_teacher_with_enrollment(assigned_to: class_discipline))["Authorization"] }

        run_test!
      end

      response "404", "cross-school class id" do
        let(:school_class_id) { create(:school_class, school: create(:school)).id }

        run_test!
      end

      response "404", "class/subject pair with no class_discipline" do
        let(:subject_id) { create(:subject, school: school).id }

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/academics/classes/{school_class_id}/grade_book/entries" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :school_class_id, in: :path, type: :integer

    put "Upsert one grade book cell" do
      tags "Academic", "Grades"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :grade_entry, in: :body, schema: {
        type: :object,
        properties: {
          grade_entry: {
            type: :object,
            properties: {
              student_id: { type: :integer },
              academic_period_id: { type: :integer },
              evaluation_component_id: { type: :integer },
              value: { type: :string }
            }
          }
        }
      }

      let(:grade_entry) do
        {
          grade_entry: {
            student_id: student.id,
            academic_period_id: period.id,
            evaluation_component_id: component.id,
            value: "9.5"
          }
        }
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "200", "writes the cell" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["data"]).to eq(
            "student_id" => student.id,
            "academic_period_id" => period.id,
            "evaluation_component_id" => component.id,
            "value" => "9.5"
          )
          expect(
            GradeEntry.kept.find_by(student: student, academic_period: period, evaluation_component: component).value
          ).to eq("9.5")
        end
      end

      response "403", "a teacher not assigned to this class/subject" do
        let(:Authorization) { auth_headers_for(create_teacher_with_enrollment)["Authorization"] }

        run_test!
      end

      response "409", "the period is closed" do
        before { period.update!(closure_status: "closed") }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("period_closed")
        end
      end

      response "422", "an invalid value" do
        let(:grade_entry) do
          {
            grade_entry: {
              student_id: student.id,
              academic_period_id: period.id,
              evaluation_component_id: component.id,
              value: nil
            }
          }
        end

        before do
          allow_any_instance_of(GradeEntry).to receive(:valid?) do |record|
            record.errors.add(:value, "is invalid")
            false
          end
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
        end
      end
    end
  end
end
