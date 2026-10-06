# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::Conversations", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:school_class) { create(:school_class, school: school, grade_level: "fundamental_i_1") }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Lara Costa") }
  let(:guardian_user) { create(:user) }
  let(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Diego") }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:family_link) do
    create(:student_guardian, school: school, student: student, guardian: guardian, relationship: "father")
  end
  let(:mother_user) { create(:user) }
  let(:mother) { create(:guardian, school: school, user: mother_user, name: "Marina") }
  let!(:mother_link) do
    create(:student_guardian, school: school, student: student, guardian: mother, relationship: "mother")
  end
  let!(:mother_membership) { create(:membership, user: mother_user, school: school, role: "guardian") }
  let(:teacher) { create(:teacher, school: school, name: "Ana Lima") }
  let(:teacher_user) { create(:user, email: teacher.email) }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:teacher_profile) do
    create(:staff_profile, membership: teacher_membership, school: school, role_template: role_templates.fetch("teacher"))
  end
  let(:secretary_user) { create(:user) }
  let!(:secretary_membership) { staff_membership("secretary", secretary_user) }
  let(:director_user) { create(:user) }
  let!(:director_membership) { staff_membership("director", director_user) }
  let(:coordination_user) { create(:user) }
  let!(:coordination_membership) { staff_membership("coordination", coordination_user) }
  let(:role_templates) do
    Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
  end
  let!(:coordination_conversation) do
    create(:conversation, school: school, student: student, last_message_at: 1.hour.ago)
  end
  let!(:secretary_conversation) do
    create(:conversation, :secretary, school: school, student: student, last_message_at: 2.hours.ago)
  end
  let!(:teacher_conversation) do
    create(
      :conversation,
      :with_teacher,
      school: school,
      student: student,
      teacher: teacher,
      last_message_at: 3.hours.ago
    )
  end
  let(:direction_teacher) { create(:teacher, school: school, name: "Bruno Lima") }
  let!(:direction_conversation) do
    create(
      :conversation,
      :with_teacher,
      school: school,
      student: student,
      teacher: direction_teacher,
      last_message_at: 4.hours.ago
    )
  end
  let(:coordination_teacher) { create(:teacher, school: school, name: "Davi Souza") }
  let!(:coordination_staff_conversation) do
    create(
      :conversation,
      :with_teacher,
      school: school,
      student: student,
      teacher: coordination_teacher,
      last_message_at: 6.hours.ago
    )
  end
  let(:quiet_teacher) { create(:teacher, school: school, name: "Carla Nunes") }
  let!(:quiet_conversation) do
    create(
      :conversation,
      :with_teacher,
      school: school,
      student: student,
      teacher: quiet_teacher,
      last_message_at: 5.hours.ago
    )
  end
  let!(:father_message) do
    create(
      :message,
      conversation: coordination_conversation,
      school: school,
      sender_membership: guardian_membership,
      body: "From the father",
      sent_at: 90.minutes.ago
    )
  end
  let!(:mother_message) do
    create(
      :message,
      conversation: coordination_conversation,
      school: school,
      sender_membership: mother_membership,
      body: "From the mother",
      sent_at: 30.minutes.ago
    )
  end
  let!(:secretary_message) do
    create(
      :message,
      conversation: secretary_conversation,
      school: school,
      sender_membership: secretary_membership,
      body: "From the secretary",
      sent_at: 2.hours.ago
    )
  end
  let!(:teacher_message) do
    create(
      :message,
      conversation: teacher_conversation,
      school: school,
      sender_membership: teacher_membership,
      body: "From the teacher",
      sent_at: 3.hours.ago
    )
  end
  let!(:director_message) do
    create(
      :message,
      conversation: direction_conversation,
      school: school,
      sender_membership: director_membership,
      body: "From direction",
      sent_at: 4.hours.ago
    )
  end
  let!(:coordination_staff_message) do
    create(
      :message,
      conversation: coordination_staff_conversation,
      school: school,
      sender_membership: coordination_membership,
      body: "From coordination",
      sent_at: 6.hours.ago
    )
  end
  let!(:other_school_conversation) { create(:conversation) }
  let(:outsider) { create(:user) }
  let!(:outsider_membership) { create(:membership, user: outsider, school: school, role: "school") }
  let(:Authorization) { auth_headers_for(coordination_user)["Authorization"] }

  def staff_membership(system_key, user)
    membership = create(:membership, :staff, user: user, school: school)
    create(
      :staff_profile,
      membership: membership,
      school: school,
      role_template: role_templates.fetch(system_key)
    )
    membership
  end

  path "/api/v1/schools/{school_id}/communication/conversations" do
    parameter name: :school_id, in: :path, type: :integer

    get "List conversations the actor may see" do
      tags "Communication"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :audience, in: :query, type: :string, required: false,
                description: "Optional audience filter. Coordination uses coordination for For me."

      response "200", "coordination for me returns only coordination rows" do
        let(:audience) { "coordination" }

        run_test! do |response|
          body = JSON.parse(response.body)
          ids = body.fetch("data").map { |row| row["id"] }

          expect(ids).to eq([ coordination_conversation.id ])
          expect(body.dig("meta", "page")).to eq(1)
          expect(body.dig("meta", "total")).to eq(1)
          expect(body.dig("meta", "per_page")).to be_present
          row = body.fetch("data").first

          expect(row).to include(
            "student_id" => student.id,
            "audience" => "coordination",
            "teacher_id" => nil,
            "school_class_id" => school_class.id,
            "sender_line" => "Marina, mãe da Lara Costa — 1º ano"
          )
          expect(row.keys).to match_array(
            %w[id student_id audience teacher_id last_message_at school_class_id sender_line]
          )
        end
      end

      response "200", "omitting audience returns every conversation coordination can see" do
        run_test! do |response|
          body = JSON.parse(response.body)
          ids = body.fetch("data").map { |row| row["id"] }
          rows = body.fetch("data").index_by { |row| row["id"] }

          expect(ids).to eq([
            coordination_conversation.id,
            secretary_conversation.id,
            teacher_conversation.id,
            direction_conversation.id,
            quiet_conversation.id,
            coordination_staff_conversation.id
          ])
          expect(ids).not_to include(other_school_conversation.id)
          expect(body.dig("meta", "total")).to eq(6)
          expect(rows[coordination_conversation.id]).to include(
            "sender_line" => "Marina, mãe da Lara Costa — 1º ano"
          )
          expect(rows[secretary_conversation.id]).to include(
            "sender_line" => "secretaria — Lara Costa — 1º ano"
          )
          expect(rows[teacher_conversation.id]).to include(
            "audience" => "teacher",
            "teacher_id" => teacher.id,
            "school_class_id" => school_class.id,
            "sender_line" => "Ana Lima — Lara Costa — 1º ano"
          )
          expect(rows[direction_conversation.id]).to include(
            "sender_line" => "direção — Lara Costa — 1º ano"
          )
          expect(rows[coordination_staff_conversation.id]).to include(
            "sender_line" => "coordenação — Lara Costa — 1º ano"
          )
          expect(rows[quiet_conversation.id]).to include("sender_line" => nil)
          expect(rows[quiet_conversation.id].keys).to include("sender_line")
        end
      end

      response "403", "a school role without an inbox cannot list conversations" do
        let(:Authorization) { auth_headers_for(outsider)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "another school" do
        let(:school_id) { create(:school).id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("unauthorized")
        end
      end
    end
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
