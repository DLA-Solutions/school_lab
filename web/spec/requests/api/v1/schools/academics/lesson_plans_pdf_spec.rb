# frozen_string_literal: true

require "swagger_helper"

# Lesson plan (BR-LP07 template) as a PDF preview (UC-LP05, BR-LP08) -- gated by the same scope as
# LessonPlanPolicy#show? (BR-LP02): the class_discipline's assigned teacher, or manage_academic
# staff school-wide.
RSpec.describe "Api::V1::Schools::Academics::LessonPlans pdf", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }

  let(:school_class) { create(:school_class, school: school) }
  let(:subject) { create(:subject, school: school, name: "Matemática") }

  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }

  let(:class_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: subject, teacher: carla)
  end

  let!(:lesson_plan) do
    create(:lesson_plan, school: school, class_discipline: class_discipline, date: Date.current,
                          topic: "Introdução a frações",
                          general_objective: "Compreender o conceito de fração como parte de um todo.",
                          assessment_types: [ "formative" ], assessment_formats: [ "exercises" ])
  end
  let(:id) { lesson_plan.id }

  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/academics/lesson_plans/{id}/pdf" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "The lesson plan as a PDF, for its teacher or manage_academic staff" do
      tags "LessonPlans", "Academic"
      produces "application/pdf", "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "200", "the assigned teacher previews their own plan" do
        run_test! do |response|
          expect(response.media_type).to eq("application/pdf")

          text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
          expect(text).to include(school.name)
          expect(text).to include("Carla Souza")
          expect(text).to include("Matemática")
          expect(text).to include("Introdução a frações")
          expect(text).to include("Compreender o conceito de fração como parte de um todo.")
        end
      end

      # AC-LP06 / BR-LP02: a teacher not assigned to this class_discipline cannot preview it.
      response "403", "a teacher not assigned to this class_discipline" do
        let(:Authorization) do
          other_user = create(:user)
          create(:membership, user: other_user, school: school, role: "teacher")
          create(:teacher, school: school, email: other_user.email, name: "Outro Professor")
          auth_headers_for(other_user)["Authorization"]
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "cross-school lesson plan" do
        let(:id) { create(:lesson_plan, school: create(:school)).id }

        run_test!
      end
    end
  end

  # AC-LP06: manage_academic staff preview any plan in the school, independent of class_discipline.
  it "lets manage_academic staff preview any lesson plan in the school" do
    staff_user = create(:user)
    membership = create(:membership, user: staff_user, school: school, role: "staff")
    template = create(:school_role_template, school: school)
    create(:role_template_permission, school: school, role_template: template, permission_key: "manage_academic")
    create(:staff_profile, membership: membership, school: school, role_template: template)

    get "/api/v1/schools/#{school.id}/academics/lesson_plans/#{lesson_plan.id}/pdf",
        headers: auth_headers_for(staff_user)

    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("application/pdf")
  end

  # AC-LP05: template fields are optional -- the PDF still renders with none of them set.
  it "renders successfully when none of the BR-LP07 template fields are set" do
    bare_plan = create(:lesson_plan, school: school, class_discipline: class_discipline, date: Date.current + 1.day,
                                      duration: nil, unit_stage: nil, topic: nil, general_objective: nil,
                                      specific_objectives: nil, bncc_competencies: nil, other_competencies: nil,
                                      resources_materials: nil, assessment_types: [], assessment_formats: [])

    get "/api/v1/schools/#{school.id}/academics/lesson_plans/#{bare_plan.id}/pdf",
        headers: auth_headers_for(teacher_user)

    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("application/pdf")
  end
end
