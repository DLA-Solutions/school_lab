# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::Destinations", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:school_class) { create(:school_class, school: school, grade_level: "fundamental_i_1") }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Lara Costa") }
  let(:empty_class) { create(:school_class, school: school, year: 2026) }
  let(:unassigned_student) { create(:student, school: school, school_class: empty_class, name: "No Teacher") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
  let(:portuguese) { create(:subject, school: school, name: "Português") }
  let(:teacher) { create(:teacher, school: school, name: "Ana Lima") }
  let(:guardian_user) { create(:user) }
  let(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Diego") }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:family_link) do
    create(:student_guardian, school: school, student: student, guardian: guardian, relationship: "father")
  end
  let!(:unassigned_link) do
    create(:student_guardian, school: school, student: unassigned_student, guardian: guardian, relationship: "other")
  end
  let!(:maths_assignment) do
    create(:teaching_assignment, school: school, teacher: teacher, school_class: school_class, subject: maths)
  end
  let!(:portuguese_assignment) do
    create(:teaching_assignment, school: school, teacher: teacher, school_class: school_class, subject: portuguese)
  end
  let(:other_user) { create(:user) }
  let(:other_guardian) { create(:guardian, school: school, user: other_user) }
  let!(:other_membership) { create(:membership, user: other_user, school: school, role: "guardian") }
  let(:other_child) { create(:student, school: school, school_class: school_class) }
  let!(:other_link) do
    create(:student_guardian, school: school, student: other_child, guardian: other_guardian, relationship: "mother")
  end
  let(:secretary_user) { create(:user) }
  let!(:secretary_membership) { staff_membership("secretary", secretary_user) }
  let(:role_templates) do
    Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
  end
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
  let(:student_id) { student.id }

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

  path "/api/v1/schools/{school_id}/communication/destinations" do
    parameter name: :school_id, in: :path, type: :integer

    get "List who a linked guardian can write to" do
      tags "Communication"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :student_id, in: :query, type: :integer, required: true

      response "200", "coordination, secretary, and each class teacher once" do
        run_test! do |response|
          body = JSON.parse(response.body)

          expect(teacher.teaching_assignments.kept.where(school_class: school_class).count).to eq(2)
          expect(body.fetch("data")).to eq([
            { "audience" => "coordination", "teacher_id" => nil, "name" => nil },
            { "audience" => "secretary", "teacher_id" => nil, "name" => nil },
            { "audience" => "teacher", "teacher_id" => teacher.id, "name" => "Ana Lima" }
          ])
        end
      end

      response "200", "a child with no teaching assignment lists coordination and secretary only" do
        let(:student_id) { unassigned_student.id }

        run_test! do |response|
          body = JSON.parse(response.body)

          expect(body.fetch("data")).to eq([
            { "audience" => "coordination", "teacher_id" => nil, "name" => nil },
            { "audience" => "secretary", "teacher_id" => nil, "name" => nil }
          ])
        end
      end

      response "404", "another family's child" do
        let(:Authorization) { auth_headers_for(other_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "404", "unknown student" do
        let(:student_id) { create(:student).id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "403", "secretary cannot list destinations" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }

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
