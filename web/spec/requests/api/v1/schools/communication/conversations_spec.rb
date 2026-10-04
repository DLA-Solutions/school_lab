# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::Conversations", type: :request do
  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, year: 2026, name: "A") }
  let(:other_class) { create(:school_class, school: school, year: 2026, name: "B") }
  let!(:ana) { create(:student, school: school, school_class: school_class, name: "Ana Costa") }
  let!(:bruno) { create(:student, school: school, school_class: school_class, name: "Bruno Lima") }
  let!(:zoe) { create(:student, school: school, school_class: other_class, name: "Zoe Dias") }
  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
  let(:headers) { auth_headers_for(teacher_user) }
  let(:base) { "/api/v1/schools/#{school.id}/communication/conversations" }

  before do
    create(:teaching_assignment, school: school, teacher: carla, school_class: school_class, subject: maths)
  end

  path "/api/v1/schools/{school_id}/communication/conversations" do
    parameter name: :school_id, in: :path, type: :integer

    get "List children the teacher can message" do
      tags "Communication"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "assigned children, with a thread only after the first send" do
        run_test! do
          body = response.parsed_body
          names = body.fetch("data").map { |row| row.fetch("student_name") }

          expect(names).to eq([ "Ana Costa", "Bruno Lima" ])
          expect(names).not_to include("Zoe Dias")
          expect(body.fetch("data").map { |row| row.fetch("conversation_id") }).to all(be_nil)
          expect(body.fetch("data").map { |row| row.fetch("last_message_at") }).to all(be_nil)
          expect(body.dig("meta", "total")).to eq(2)

          post "#{base}/#{ana.id}/messages",
               params: { body: "Bom dia, Ana." },
               headers: headers,
               as: :json

          expect(response).to have_http_status(:created)

          get base, headers: headers
          listed = response.parsed_body.fetch("data").find { |row| row["student_id"] == ana.id }
          expect(listed["conversation_id"]).to eq(Conversation.kept.find_by!(student_id: ana.id).id)
          expect(listed["last_message_at"]).to be_present
          expect(response.parsed_body.fetch("data").find { |row| row["student_id"] == bruno.id }["conversation_id"]).to be_nil
        end
      end

      response "404", "manage_academic does not read private threads" do
        let(:Authorization) { auth_headers_for(manage_academic_staff)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "401", "missing token" do
        let(:Authorization) { nil }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("unauthorized")
        end
      end
    end
  end

  def manage_academic_staff
    user = create(:user)
    membership = create(:membership, user: user, school: school, role: "staff")
    template = create(:school_role_template, school: school)
    create(:role_template_permission, school: school, role_template: template, permission_key: "manage_academic")
    create(:staff_profile, membership: membership, school: school, role_template: template)
    user
  end
end

RSpec.describe "Disabled user access", type: :request do
  let(:school) { create(:school) }
  let(:user) { create(:user, :disabled) }
  let!(:membership) { create(:membership, user: user, school: school, role: "school", status: "active") }
  let(:headers) { auth_headers_for(user) }

  it "denies school-scoped access with 401" do
    get "/api/v1/schools/#{school.id}/communication/conversations", headers: headers

    expect(response).to have_http_status(:unauthorized)
    expect(json.dig("error", "code")).to eq("unauthorized")
  end
end
