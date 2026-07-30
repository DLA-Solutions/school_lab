# frozen_string_literal: true

require "rails_helper"

RSpec.describe "db:seed" do
  before { Rails.application.load_seed }

  it "creates a demo school with admin, guardian, student link, and open charge" do
    school = School.find_by!(cnpj: DemoSchool::SCHOOL_CNPJ)
    admin_user = User.find_by!(email: DemoSchool::ADMIN_EMAIL)
    guardian_user = User.find_by!(email: DemoSchool::GUARDIAN_EMAIL)
    guardian = Guardian.find_by!(school: school, user: guardian_user)
    student = Student.find_by!(school: school, name: "Pedro Silva")

    expect(Membership.exists?(user: admin_user, school: school, role: "school", status: "active")).to be(true)
    expect(Membership.exists?(user: guardian_user, school: school, role: "guardian", status: "active")).to be(true)
    expect(StudentGuardian.exists?(school: school, student: student, guardian: guardian)).to be(true)

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
      charges: Charge.count
    }

    Rails.application.load_seed

    expect(School.count).to eq(counts[:schools])
    expect(User.count).to eq(counts[:users])
    expect(Charge.count).to eq(counts[:charges])
  end
end

RSpec.describe "Demo school guardian API", type: :request do
  before { Rails.application.load_seed }

  it "lets the guardian log in and list open charges" do
    school = School.find_by!(cnpj: DemoSchool::SCHOOL_CNPJ)

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
      billing_period: DemoSchool::DEMO_CHARGE_PERIOD
    )

    expect(charge_ids).to include(expected_charge.id)
  end
end
