# frozen_string_literal: true

require "swagger_helper"

# A teacher's own self-service view of their health profile (BC6) -- resolved by email match
# against Current.user, never by a :teacher_id param, so a teacher cannot reach a colleague's
# profile by changing the URL (see the staff-facing teacher_health_profiles_spec one level up for
# that boundary from the other side).
RSpec.describe "Api::V1::Schools::Academics::Me::TeacherHealthProfiles", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }

  let(:teacher_user) { create(:user, email: "ana@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:teacher) { create(:teacher, school: school, email: teacher_user.email) }
  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/academics/me/teacher_health_profile" do
    parameter name: :school_id, in: :path, type: :integer

    get "A teacher reads their own health profile" do
      tags "Academics", "Health"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "200", "an empty/default profile when nothing has been filled in yet" do
        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["teacher_id"]).to eq(teacher.id)
          expect(body["blood_type"]).to be_nil
        end
      end

      response "200", "the profile after it has been filled in" do
        before do
          create(:teacher_health_profile, school: school, teacher: teacher, blood_type: "O+")
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "blood_type")).to eq("O+")
        end
      end

      # 404 if the logged-in user has no matching Teacher row at this school.
      response "404", "a teacher membership with no matching Teacher row" do
        let(:mismatched_user) { create(:user, email: "no-match@example.com") }
        let!(:mismatched_membership) do
          create(:membership, user: mismatched_user, school: school, role: "teacher")
        end
        let(:Authorization) { auth_headers_for(mismatched_user)["Authorization"] }

        run_test!
      end
    end

    put "A teacher writes their own health profile" do
      tags "Academics", "Health"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          health_profile: {
            type: :object,
            properties: {
              blood_type: { type: :string },
              health_plan_name: { type: :string },
              health_plan_number: { type: :string },
              emergency_contact_name: { type: :string },
              emergency_contact_phone: { type: :string },
              special_care_notes: { type: :string }
            }
          }
        }
      }

      response "200", "persists valid fields and reads them back" do
        let(:payload) do
          {
            health_profile: {
              blood_type: "AB+",
              health_plan_name: "Amil",
              health_plan_number: "12345",
              emergency_contact_name: "Beatriz",
              emergency_contact_phone: "11999990000",
              special_care_notes: "Allergic to penicillin"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["blood_type"]).to eq("AB+")
          expect(body["health_plan_name"]).to eq("Amil")
          expect(body["emergency_contact_name"]).to eq("Beatriz")

          get "/api/v1/schools/#{school.id}/academics/me/teacher_health_profile",
              headers: { "Authorization" => Authorization() }
          expect(JSON.parse(response.body).dig("data", "blood_type")).to eq("AB+")
        end
      end

      response "422", "an invalid blood type is rejected" do
        let(:payload) { { health_profile: { blood_type: "Z+" } } }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("error")
          expect(body["code"]).to eq("validation_error")
          expect(body["details"]).to have_key("blood_type")
        end
      end

      response "404", "a teacher membership with no matching Teacher row" do
        let(:mismatched_user) { create(:user, email: "no-match-write@example.com") }
        let!(:mismatched_membership) do
          create(:membership, user: mismatched_user, school: school, role: "teacher")
        end
        let(:Authorization) { auth_headers_for(mismatched_user)["Authorization"] }
        let(:payload) { { health_profile: { blood_type: "O+" } } }

        run_test!
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }
        let(:payload) { { health_profile: { blood_type: "O+" } } }

        run_test!
      end
    end
  end
end
