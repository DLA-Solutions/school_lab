# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Enrolling a student against the parents' CPFs", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:path) { "/api/v1/schools/#{school.id}/people/students" }

  let(:school_class) { create(:school_class, school: school, grade_level: "fundamental_i_5") }
  let!(:mother) { create(:guardian, school: school, cpf: "12345678909", name: "Maria Silva") }
  let!(:father) { create(:guardian, school: school, cpf: "52998224725", name: "João Silva") }

  def enrol(extra)
    post path,
         params: {
           student: {
             name: "Pedro Silva",
             cpf: "158.521.190-75",
             rg: "MG-14.235.789",
             birth_date: "2015-03-10",
             school_class_id: school_class.id
           }.merge(extra)
         },
         headers: headers,
         as: :json
  end

  it "links both parents when both CPFs are given" do
    enrol(father_cpf: "529.982.247-25", mother_cpf: "123.456.789-09")

    expect(response).to have_http_status(:created)

    links = response.parsed_body.dig("data", "guardians")
    expect(links.to_h { |g| [g["relationship"], g["name"]] })
      .to eq("father" => "João Silva", "mother" => "Maria Silva")
  end

  # Not every child has both parents on file.
  it "accepts only the mother" do
    enrol(mother_cpf: "123.456.789-09")

    expect(response).to have_http_status(:created)
    expect(response.parsed_body.dig("data", "guardians").map { |g| g["relationship"] }).to eq(["mother"])
  end

  it "accepts only the father" do
    enrol(father_cpf: "529.982.247-25")

    expect(response).to have_http_status(:created)
    expect(response.parsed_body.dig("data", "guardians").map { |g| g["relationship"] }).to eq(["father"])
  end

  it "refuses a student with neither parent" do
    enrol({})

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body.dig("error", "details", "base")).to be_present
  end

  # The CPF is what the school has; naming the missing one tells them what to fix.
  it "names the CPF that matches no guardian" do
    enrol(mother_cpf: "158.521.190-75")

    expect(response).to have_http_status(:unprocessable_content)
    details = response.parsed_body.dig("error", "details")
    expect(details["mother_cpf"].first).to include("158.521.190-75")
  end

  it "does not create the student when a parent CPF is unknown" do
    expect { enrol(father_cpf: "158.521.190-75") }.not_to change(Student.kept, :count)
  end

  it "refuses a guardian from another school" do
    outsider = create(:guardian, school: create(:school), cpf: "15852119075")

    enrol(mother_cpf: outsider.cpf)

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body.dig("error", "details")).to have_key("mother_cpf")
  end

  it "refuses the same CPF as both father and mother" do
    enrol(father_cpf: "123.456.789-09", mother_cpf: "123.456.789-09")

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body.dig("error", "details", "base")).to be_present
  end

  it "matches the guardian however the CPF is formatted" do
    enrol(mother_cpf: "12345678909")

    expect(response).to have_http_status(:created)
  end
end
