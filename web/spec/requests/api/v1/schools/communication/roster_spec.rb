# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::Roster", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:school_class) { create(:school_class, school: school, grade_level: "fundamental_i_1") }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Lara Costa") }
  let(:empty_class) { create(:school_class, school: school) }
  let(:other_class) { create(:school_class, school: school) }
  let(:foreign_class) { create(:school_class, school: create(:school)) }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
  let(:portuguese) { create(:subject, school: school, name: "Português") }
  let(:teacher) { create(:teacher, school: school, name: "Ana Lima") }
  let(:teacher_user) { create(:user, email: teacher.email) }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:teacher_profile) do
    create(
      :staff_profile,
      membership: teacher_membership,
      school: school,
      role_template: role_templates.fetch("teacher")
    )
  end
  let(:other_teacher) { create(:teacher, school: school, name: "Bruno Lima") }
  let(:other_teacher_user) { create(:user, email: other_teacher.email) }
  let!(:other_teacher_membership) do
    create(:membership, user: other_teacher_user, school: school, role: "teacher")
  end
  let!(:other_teacher_profile) do
    create(
      :staff_profile,
      membership: other_teacher_membership,
      school: school,
      role_template: role_templates.fetch("teacher")
    )
  end
  let(:guardian_user) { create(:user) }
  let(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Diego") }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:family_link) do
    create(:student_guardian, school: school, student: student, guardian: guardian, relationship: "father")
  end
  let(:secretary_user) { create(:user) }
  let!(:secretary_membership) { staff_membership("secretary", secretary_user) }
  let(:director_user) { create(:user) }
  let!(:director_membership) { staff_membership("director", director_user) }
  let(:role_templates) do
    Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
  end
  let!(:maths_assignment) do
    create(:teaching_assignment, school: school, teacher: teacher, school_class: school_class, subject: maths)
  end
  let!(:portuguese_assignment) do
    create(:teaching_assignment, school: school, teacher: teacher, school_class: school_class, subject: portuguese)
  end
  let!(:empty_class_assignment) do
    create(:teaching_assignment, school: school, teacher: teacher, school_class: empty_class, subject: maths)
  end
  let!(:other_class_assignment) do
    create(:teaching_assignment, school: school, teacher: other_teacher, school_class: other_class, subject: maths)
  end
  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
  let(:school_class_id) { school_class.id }

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

  def roster_item_without_destinations(body)
    item = body.fetch("data").sole

    expect(item.keys).to match_array(
      %w[student_id student_name school_class_id conversation_id sender_line teacher_id]
    )
    item
  end

  path "/api/v1/schools/{school_id}/communication/roster" do
    parameter name: :school_id, in: :path, type: :integer

    get "List children of a class for the family-chat roster" do
      tags "Communication"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :school_class_id, in: :query, type: :integer, required: true

      response "200", "teacher of the class sees the student" do
        run_test! do |response|
          item = roster_item_without_destinations(JSON.parse(response.body))
          teacher_keys = role_templates.fetch("teacher").role_template_permissions.kept.pluck(:permission_key)

          expect(teacher_keys).not_to include("manage_people")
          expect(item).to eq(
            "student_id" => student.id,
            "student_name" => "Lara Costa",
            "school_class_id" => school_class.id,
            "conversation_id" => nil,
            "sender_line" => nil,
            "teacher_id" => teacher.id
          )
        end
      end

      response "200", "teacher's first message creates the conversation a linked guardian can read" do
        run_test! do |roster_response|
          roster = roster_item_without_destinations(JSON.parse(roster_response.body))

          expect(roster).to include(
            "conversation_id" => nil,
            "sender_line" => nil,
            "teacher_id" => teacher.id
          )

          post "/api/v1/schools/#{school.id}/communication/messages",
               params: {
                 student_id: student.id,
                 audience: "teacher",
                 teacher_id: teacher.id,
                 body: "Hello"
               },
               headers: auth_headers_for(teacher_user),
               as: :json

          expect(response).to have_http_status(:created)
          conversation_id = response.parsed_body.dig("data", "conversation_id")
          expect(conversation_id).to be_present

          get "/api/v1/schools/#{school.id}/communication/conversations/#{conversation_id}/messages",
              headers: auth_headers_for(guardian_user)

          expect(response).to have_http_status(:ok)
          expect(response.parsed_body.fetch("data").map { |row| row["body"] }).to eq([ "Hello" ])
        end
      end

      response "404", "a colleague who teaches another class does not see this student" do
        let(:Authorization) { auth_headers_for(other_teacher_user)["Authorization"] }

        run_test! do |response|
          expect(other_teacher.teaching_assignments.kept.where(school_class: school_class)).to be_empty
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "404", "teacher requesting a class they do not teach" do
        let(:school_class_id) { other_class.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "200", "secretary sees the student" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }

        run_test! do |response|
          item = roster_item_without_destinations(JSON.parse(response.body))

          expect(item).to eq(
            "student_id" => student.id,
            "student_name" => "Lara Costa",
            "school_class_id" => school_class.id,
            "conversation_id" => nil,
            "sender_line" => nil,
            "teacher_id" => nil
          )
        end
      end

      response "200", "empty class the teacher is assigned to" do
        let(:school_class_id) { empty_class.id }

        run_test! do |response|
          expect(JSON.parse(response.body)).to eq("data" => [])
        end
      end

      response "404", "a class from another school" do
        let(:school_class_id) { foreign_class.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "200", "director lists destinations and does not attach a conversation" do
        let(:Authorization) { auth_headers_for(director_user)["Authorization"] }

        run_test! do |response|
          item = JSON.parse(response.body).fetch("data").sole

          expect(teacher.teaching_assignments.kept.where(school_class: school_class).count).to eq(2)
          expect(item.keys).to match_array(
            %w[student_id student_name school_class_id conversation_id sender_line destinations]
          )
          expect(item).to include(
            "student_id" => student.id,
            "student_name" => "Lara Costa",
            "school_class_id" => school_class.id,
            "conversation_id" => nil,
            "sender_line" => nil
          )
          expect(item.fetch("destinations")).to eq([
            { "audience" => "coordination", "teacher_id" => nil, "name" => nil },
            { "audience" => "secretary", "teacher_id" => nil, "name" => nil },
            { "audience" => "teacher", "teacher_id" => teacher.id, "name" => "Ana Lima" }
          ])
        end
      end

      response "403", "a linked guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
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
