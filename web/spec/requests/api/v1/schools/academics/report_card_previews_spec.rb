# frozen_string_literal: true

require "swagger_helper"

# Teacher live, unpublished, cross-subject PDF preview of a student's boletim (BR-RC14, UC-RC04).
# Renders from current grade/attendance state; never touches report_card_publications or
# report_card_snapshots.
RSpec.describe "Api::V1::Schools::Academics::ReportCardPreviews", type: :request do
  include PermissionsFactoryHelpers

  let(:school) { create(:school) }
  let(:school_id) { school.id }

  let(:school_year) { create(:school_year, :custom, school: school) }
  let(:school_class) { create(:school_class, school: school, year: school_year.starts_on.year) }
  let(:academic_period) do
    create(:academic_period, school_year: school_year, school: school, closure_status: "open")
  end
  let(:academic_period_id) { academic_period.id }

  let(:math_subject) { create(:subject, school: school, name: "Matemática") }
  let(:science_subject) { create(:subject, school: school, name: "Ciências") }

  let!(:math_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: math_subject,
                              school_year: school_year)
  end
  let!(:science_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: science_subject,
                              school_year: school_year)
  end

  let(:student) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }
  let(:student_id) { student.id }

  # Teaches only math -- BR-RC14's whole point is that the preview is not limited to what this
  # teacher actually teaches.
  def create_math_teacher
    teacher_user = create(:user)
    create(:membership, user: teacher_user, school: school, role: "teacher")
    teacher_record = create(:teacher, school: school, email: teacher_user.email)
    math_discipline.update!(teacher: teacher_record)
    teacher_user
  end

  let(:Authorization) { auth_headers_for(create_math_teacher)["Authorization"] }

  path "/api/v1/schools/{school_id}/academics/students/{student_id}/report_card_preview/pdf" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :student_id, in: :path, type: :integer
    parameter name: :academic_period_id, in: :query, type: :integer

    get "Teacher live, unpublished, cross-subject boletim preview" do
      tags "Report Cards", "Academic"
      produces "application/pdf", "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "200", "includes every class_discipline, including one the teacher does not teach" do
        before do
          template = create(:evaluation_template, school: school, school_class: school_class,
                                                   academic_period: academic_period)
          component = create(:evaluation_component, school: school, evaluation_template: template,
                                                     class_discipline: math_discipline,
                                                     grade_scale: create(:grade_scale, school: school),
                                                     weight_percent: 100, position: 1)
          create(:grade_entry, school: school, student: student, class_discipline: math_discipline,
                               academic_period: academic_period, evaluation_component: component,
                               value: "9.0")
          create(:grade_launch, school: school, school_class: school_class,
                                class_discipline: math_discipline, academic_period: academic_period)
          # science_discipline gets no template/entry/launch at all -- still must appear, blank.
        end

        run_test! do |response|
          expect(response.media_type).to eq("application/pdf")

          text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
          expect(text).to include("Pedro Silva")
          expect(text).to include("Matemática")
          expect(text).to include("Ciências")
        end
      end

      response "200", "no grade data at all for the period renders blank, not a 422" do
        run_test! do |response|
          expect(response).to have_http_status(:ok)
          expect(response.media_type).to eq("application/pdf")

          text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
          expect(text).to include("Matemática")
          expect(text).to include("Ciências")
        end
      end

      response "403", "a non-teacher role, even a full owner" do
        let(:Authorization) { auth_headers_for(create_owner_membership(school).first)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "cross-school student" do
        let(:student_id) { create(:student, school: create(:school)).id }

        run_test!
      end

      response "404", "cross-school academic period" do
        let(:academic_period_id) do
          other_school = create(:school)
          create(:academic_period, school_year: create(:school_year, school: other_school)).id
        end

        run_test!
      end

      response "404", "unknown student" do
        let(:student_id) { 0 }

        run_test!
      end
    end
  end

  describe "creates nothing" do
    it "persists no report_card_publication or report_card_snapshot" do
      headers = auth_headers_for(create_math_teacher)

      get "/api/v1/schools/#{school.id}/academics/students/#{student.id}/report_card_preview/pdf",
          params: { academic_period_id: academic_period.id }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(ReportCardPublication.count).to eq(0)
      expect(ReportCardSnapshot.count).to eq(0)
    end
  end
end
