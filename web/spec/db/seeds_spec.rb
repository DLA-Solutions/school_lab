# frozen_string_literal: true

require "rails_helper"

RSpec.describe "db:seed" do
  before { Rails.application.load_seed }

  it "creates a demo school with all actor types, students, and billing" do
    school = School.find_by!(cnpj: DemoSchool::SCHOOL_CNPJ)

    expect(Student.where(school: school).count).to be_between(50, 100)
    expect(Guardian.where(school: school).count).to be >= 50
    expect(SchoolClass.where(school: school).count).to be >= 10

    backoffice_membership = User.find_by!(email: DemoSchool::BACKOFFICE_EMAIL).memberships.kept.find_by!(role: "backoffice")
    expect(backoffice_membership.platform_permissions).to contain_exactly("manage_backoffice_ops", "provision_school")
    expect(User.find_by!(email: DemoSchool::ADMIN_EMAIL).memberships.kept.find_by(school: school, role: "staff")).to be_present
    expect(User.find_by!(email: DemoSchool::SECRETARY_EMAIL).memberships.kept.find_by(school: school, role: "staff")).to be_present
    expect(User.find_by!(email: DemoSchool::COORDINATOR_EMAIL).memberships.kept.find_by(school: school, role: "staff")).to be_present
    expect(User.find_by!(email: DemoSchool::TEACHER_EMAIL).memberships.kept.find_by(school: school, role: "teacher")).to be_present

    admin_user = User.find_by!(email: DemoSchool::ADMIN_EMAIL)
    guardian_user = User.find_by!(email: DemoSchool::GUARDIAN_EMAIL)
    guardian = Guardian.find_by!(school: school, user: guardian_user)
    student = Student.find_by!(school: school, name: DemoSchool::DEMO_STUDENT_NAME)

    expect(Membership.exists?(user: admin_user, school: school, role: "staff", status: "active")).to be(true)
    expect(Membership.exists?(user: guardian_user, school: school, role: "guardian", status: "active")).to be(true)
    expect(StudentGuardian.exists?(school: school, student: student, guardian: guardian)).to be(true)

    templates = school.school_role_templates.kept.system_templates
    expect(templates.count).to eq(4)
    expect(templates.map(&:system_key)).to contain_exactly(
      "director", "secretary", "coordination", "teacher"
    )

    director = school.system_role_template("director")
    expect(director.role_template_permissions.kept.pluck(:permission_key))
      .to include("manage_billing", "manage_people")

    admin_membership = Membership.find_by!(user: admin_user, school: school)
    profile = admin_membership.staff_profile
    expect(profile).to be_present
    expect(profile.is_owner).to be(true)
    expect(profile.role_template).to eq(director)
    expect(profile.display_title).to eq("Diretor")

    expect(Contract.where(school: school).count).to eq(Student.where(school: school).count)
    expect(Charge.where(school: school).count).to be >= Student.where(school: school).count

    open_charge = Charge.open.find_by!(
      school: school,
      guardian: guardian,
      billing_period: DemoSchool::DEMO_CHARGE_PERIOD
    )
    expect(open_charge.status).to eq("pending")
  end

  it "is idempotent" do
    counts = {
      schools: School.count,
      users: User.count,
      students: Student.count,
      charges: Charge.count
    }

    Rails.application.load_seed

    school = School.find_by!(cnpj: DemoSchool::SCHOOL_CNPJ)

    expect(School.count).to eq(counts[:schools])
    expect(User.count).to eq(counts[:users])
    expect(Student.count).to eq(counts[:students])
    expect(Charge.count).to eq(counts[:charges])
    expect(SchoolRoleTemplate.where(school: school).count).to eq(4)
    expect(StaffProfile.where(school: school, is_owner: true).count).to eq(1)
  end
end

RSpec.describe "Demo school guardian API", type: :request do
  before { Rails.application.load_seed }

  it "lets the guardian log in and list open charges" do
    school = School.find_by!(cnpj: DemoSchool::SCHOOL_CNPJ)
    guardian_user = User.find_by!(email: DemoSchool::GUARDIAN_EMAIL)
    guardian = Guardian.find_by!(school: school, user: guardian_user)

    post "/api/v1/auth/login",
         params: {
           email: DemoSchool::GUARDIAN_EMAIL,
           password: DemoSchool::PASSWORD,
           client: "mobile"
         },
         as: :json

    expect(response).to have_http_status(:ok)

    access_token = json.fetch("access_token")
    get "/api/v1/schools/#{school.id}/me/charges",
        headers: { "Authorization" => "Bearer #{access_token}" }

    expect(response).to have_http_status(:ok)
    charge_ids = json.fetch("data").map { |row| row["id"] }
    expected_charge = Charge.open.find_by!(
      school: school,
      guardian: guardian,
      billing_period: DemoSchool::DEMO_CHARGE_PERIOD
    )

    expect(charge_ids).to include(expected_charge.id)
  end
end
