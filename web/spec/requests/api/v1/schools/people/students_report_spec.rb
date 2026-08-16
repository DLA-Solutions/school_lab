# frozen_string_literal: true

require "rails_helper"

# The student roll as a printable table, grouped by cohort in teaching order, one class per page.
RSpec.describe "The students report", type: :request do
  let(:school) { create(:school, name: "Colégio Exemplo") }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:path) { "/api/v1/schools/#{school.id}/people/students/report" }

  let(:fifth) do
    create(:school_class, school: school, name: "A", grade_level: "fundamental_i_5",
                          shift: "matutino", year: 2026)
  end
  let(:infantil) do
    create(:school_class, school: school, name: "A", grade_level: "infantil_2",
                          shift: "vespertino", year: 2026)
  end

  let!(:pedro) do
    create(:student, school: school, school_class: fifth, name: "Pedro Silva",
                     birth_date: Date.new(2015, 3, 10))
  end
  let!(:zoe) { create(:student, school: school, school_class: infantil, name: "Zoe Alves") }

  let!(:maria) do
    create(:guardian, school: school, name: "Maria Silva", phone: "+55 11 90000-0001")
  end

  before do
    create(:student_guardian, school: school, student: pedro, guardian: maria,
                              relationship: "mother")
  end

  def text_of(body)
    PDF::Inspector::Text.analyze(body).strings.join(" ")
  end

  it "answers with a PDF, as an attachment" do
    get path, headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("application/pdf")
    expect(response.headers["Content-Disposition"]).to include("attachment")
    expect(response.body).to start_with("%PDF")
  end

  it "heads each group with the cohort named in full" do
    get path, headers: headers

    text = text_of(response.body)
    expect(text).to include("Ensino Fundamental I — 5º ano A · Matutino — 2026")
    expect(text).to include("Educação Infantil — Infantil II A · Vespertino — 2026")
  end

  # Infantil comes before Fundamental, whatever order the rows arrived in.
  it "lays the cohorts out in teaching order" do
    get path, headers: headers

    text = text_of(response.body)
    expect(text.index("Infantil II")).to be < text.index("5º ano")
  end

  # A class list is used to reach families; a roll with no way to contact anybody is half a
  # document.
  it "names the guardians and their phones by default" do
    get path, headers: headers

    text = text_of(response.body)
    expect(text).to include("Responsáveis", "Maria Silva", "+55 11 90000-0001")
  end

  it "draws only the columns asked for" do
    get "#{path}?columns=name,birth_date", headers: headers

    text = text_of(response.body)
    expect(text).to include("Estudante", "Nascimento", "10/03/2015")
    expect(text).not_to include("Responsáveis")
  end

  it "narrows by the same search the listing uses" do
    get "#{path}?q=Zoe&columns=name", headers: headers

    text = text_of(response.body)
    expect(text).to include("Zoe Alves")
    expect(text).not_to include("Pedro Silva")
  end

  # The columns arrive in a query string, so anything not on the list is dropped rather than
  # trusted.
  it "ignores a column nobody offered" do
    get "#{path}?columns=name,encrypted_password", headers: headers

    expect(response).to have_http_status(:ok)
    expect(text_of(response.body)).to include("Estudante")
  end

  it "prints a student with no cohort under their own heading" do
    pedro.update_column(:school_class_id, nil)

    get "#{path}?columns=name", headers: headers

    expect(text_of(response.body)).to include("Sem turma", "Pedro Silva")
  end

  it "refuses a caller who may not read the register" do
    other = create(:user)
    create(:membership, user: other, school: school, role: "guardian")

    get path, headers: auth_headers_for(other)

    expect(response).to have_http_status(:forbidden)
  end
end
