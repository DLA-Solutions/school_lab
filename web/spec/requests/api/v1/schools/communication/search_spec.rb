# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::Search", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:school_class) { create(:school_class, school: school, grade_level: "fundamental_i_1") }
  let(:other_class) { create(:school_class, school: school) }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Lara Costa") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
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
  let(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Diego Costa") }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:family_link) do
    create(:student_guardian, school: school, student: student, guardian: guardian, relationship: "father")
  end
  let(:director_user) { create(:user) }
  let!(:director_membership) { staff_membership("director", director_user) }
  let(:role_templates) do
    Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
  end
  let!(:maths_assignment) do
    create(:teaching_assignment, school: school, teacher: teacher, school_class: school_class, subject: maths)
  end
  let!(:other_class_assignment) do
    create(:teaching_assignment, school: school, teacher: other_teacher, school_class: other_class, subject: maths)
  end
  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
  let(:q) { "Lara" }

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

  before { student }

  path "/api/v1/schools/{school_id}/communication/search" do
    parameter name: :school_id, in: :path, type: :integer

    get "Search the family-chat roster by student or guardian name" do
      tags "Communication"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :q, in: :query, type: :string, required: false

      response "200", "teacher sees a student by name only within a class they teach" do
        run_test! do |response|
          body = JSON.parse(response.body)
          item = body.fetch("data").sole

          expect(item.keys).to match_array(
            %w[student_id student_name school_class_id conversation_id sender_line teacher_id guardians]
          )
          expect(item).to include(
            "student_id" => student.id,
            "student_name" => "Lara Costa",
            "school_class_id" => school_class.id,
            "conversation_id" => nil,
            "sender_line" => nil,
            "teacher_id" => teacher.id
          )
          expect(item.fetch("guardians")).to eq([
            { "name" => "Diego Costa", "relationship" => "father" }
          ])
        end
      end

      response "200", "a student by a guardian's name" do
        let(:q) { "Diego" }

        run_test! do |response|
          item = JSON.parse(response.body).fetch("data").sole

          expect(item.fetch("student_id")).to eq(student.id)
        end
      end

      response "200", "a colleague who teaches another class does not see this student" do
        let(:Authorization) { auth_headers_for(other_teacher_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).fetch("data")).to eq([])
        end
      end

      response "200", "director sees destinations computed per hit" do
        let(:Authorization) { auth_headers_for(director_user)["Authorization"] }

        run_test! do |response|
          item = JSON.parse(response.body).fetch("data").sole

          expect(item.keys).to match_array(
            %w[student_id student_name school_class_id conversation_id sender_line destinations guardians]
          )
          expect(item.fetch("destinations")).to eq([
            { "audience" => "coordination", "teacher_id" => nil, "name" => nil },
            { "audience" => "secretary", "teacher_id" => nil, "name" => nil },
            { "audience" => "teacher", "teacher_id" => teacher.id, "name" => "Ana Lima" }
          ])
        end
      end

      response "200", "a query under 2 characters returns an empty result" do
        let(:q) { "L" }

        run_test! do |response|
          expect(JSON.parse(response.body)).to eq("data" => [])
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
