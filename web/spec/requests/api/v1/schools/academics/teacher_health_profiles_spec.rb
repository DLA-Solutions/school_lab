# frozen_string_literal: true

require "swagger_helper"

# Staff-facing read of a collaborator's health profile (BC6), on the Colaboradores roster.
# Writing is not exposed here at all — only the teacher themself may write their own profile, via
# the academics/me self-service endpoint (teacher_health_profiles_spec under me/).
RSpec.describe "Api::V1::Schools::Academics::TeacherHealthProfiles", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }

  let(:teacher) { create(:teacher, school: school, email: "ana@example.com") }
  let(:teacher_id) { teacher.id }

  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/academics/teachers/{teacher_id}/health_profile" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :teacher_id, in: :path, type: :integer

    get "Staff read of a collaborator's health profile" do
      tags "Academics", "Health"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      # BR-CH02: a register full of untouched blank rows would report everybody as having a
      # health profile when nobody has filled one in yet.
      response "200", "an empty/absent profile for a collaborator nobody has set up yet" do
        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["teacher_id"]).to eq(teacher.id)
          expect(body["blood_type"]).to be_nil
        end
      end

      response "200", "staff with manage_people reads a filled profile" do
        before do
          create(:teacher_health_profile, school: school, teacher: teacher, blood_type: "B+")
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["blood_type"]).to eq("B+")
        end
      end

      response "403", "staff without manage_people" do
        let(:plain_user) { create(:user) }
        let(:Authorization) { auth_headers_for(plain_user)["Authorization"] }

        before do
          teacher_template = create_system_templates_for(school).find { |t| t.system_key == "teacher" }
          membership = create(:membership, user: plain_user, school: school, role: "teacher")
          create(:staff_profile, membership: membership, school: school, role_template: teacher_template)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      # AC-CH03: a teacher cannot reach a colleague's profile just because the collaborator
      # roster happens to expose a `:teacher_id`-nested path -- the policy's `own_profile?` only
      # matches the record named on the row, and plain `staff_with?(:manage_people)` is false for
      # a teacher membership with the teacher role template.
      response "403", "a teacher cannot read a colleague's profile via another teacher's id" do
        let(:other_teacher) { create(:teacher, school: school, email: "bruno@example.com") }
        let(:teacher_id) { other_teacher.id }
        let(:requesting_user) { create(:user, email: teacher.email) }
        let(:Authorization) { auth_headers_for(requesting_user)["Authorization"] }

        before do
          teacher_template = create_system_templates_for(school).find { |t| t.system_key == "teacher" }
          membership = create(:membership, user: requesting_user, school: school, role: "teacher")
          create(:staff_profile, membership: membership, school: school, role_template: teacher_template)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "cross-school collaborator" do
        let(:teacher_id) { create(:teacher, school: create(:school)).id }

        run_test!
      end

      response "404", "unknown collaborator" do
        let(:teacher_id) { 0 }

        run_test!
      end
    end
  end

  # No PUT/PATCH action is routed here at all (only :show) -- defense in depth confirming a
  # teacher has no write path to a colleague's profile through this nesting.
  it "has no write route nested under :teacher_id" do
    put "/api/v1/schools/#{school.id}/academics/teachers/#{teacher.id}/health_profile",
        params: { health_profile: { blood_type: "O+" } },
        headers: { "Authorization" => auth_headers_for(staff_user)["Authorization"] }, as: :json

    expect(response).to have_http_status(:not_found)
  end
end
