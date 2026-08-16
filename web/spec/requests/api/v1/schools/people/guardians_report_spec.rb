# frozen_string_literal: true

require "rails_helper"

# The guardian register as a printable table, with only the columns the school asked for.
RSpec.describe "The guardians report", type: :request do
  let(:school) { create(:school, name: "Colégio Exemplo") }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:path) { "/api/v1/schools/#{school.id}/people/guardians/report" }

  let(:school_class) do
    create(:school_class, school: school, name: "A", grade_level: "fundamental_i_5",
                          shift: "matutino", year: 2026)
  end
  let!(:maria) do
    create(:guardian, school: school, name: "Maria Silva", cpf: "12345678909",
                      phone: "+55 11 99999-0000")
  end
  let!(:bruno) { create(:guardian, school: school, name: "Bruno Alves", cpf: "52998224725") }

  def enrol(guardian, name)
    student = create(:student, school: school, school_class: school_class, name: name)
    create(:student_guardian, school: school, student: student, guardian: guardian,
                              relationship: "mother")
    student
  end

  # Prawn writes the text into the PDF stream; extracting it back is enough to assert what was
  # drawn without depending on the exact bytes of the layout.
  def text_of(body)
    PDF::Inspector::Text.analyze(body).strings.join(" ")
  end

  before { enrol(maria, "Pedro Silva") }

  it "answers with a PDF, as an attachment" do
    get path, headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("application/pdf")
    expect(response.headers["Content-Disposition"]).to include("attachment")
    expect(response.body).to start_with("%PDF")
  end

  it "names the school and the report" do
    get path, headers: headers

    expect(text_of(response.body)).to include("Colégio Exemplo", "Relação de responsáveis")
  end

  it "draws only the columns asked for" do
    get "#{path}?columns=name,cpf", headers: headers

    text = text_of(response.body)
    expect(text).to include("Responsável", "CPF", "Maria Silva", "123.456.789-09")
    expect(text).not_to include("Telefone", "Filho(a)")
  end

  # The cohort heads its own page now, in teaching order, so a report can be handed round a class
  # at a time.
  describe "grouping by cohort" do
    let(:infantil) do
      create(:school_class, school: school, name: "A", grade_level: "infantil_2",
                            shift: "matutino", year: 2026)
    end

    it "heads each group with the cohort named in full" do
      get "#{path}?columns=name", headers: headers

      expect(text_of(response.body))
        .to include("Ensino Fundamental I — 5º ano A · Matutino — 2026")
    end

    # Infantil comes before Fundamental, whatever order the rows arrived in.
    it "lays the cohorts out in teaching order" do
      early = create(:student, school: school, school_class: infantil, name: "Zoe")
      create(:student_guardian, school: school, student: early, guardian: bruno,
                                relationship: "mother")

      get "#{path}?columns=name", headers: headers

      text = text_of(response.body)
      infantil_at = text.index("Infantil II")
      fundamental_at = text.index("5º ano")

      expect(infantil_at).to be < fundamental_at
    end

    # They are on the register, and leaving them out would make the report disagree with the
    # listing it was printed from.
    it "prints a guardian with no child under their own heading" do
      get "#{path}?columns=name", headers: headers

      expect(text_of(response.body)).to include("Sem turma", "Bruno Alves")
    end

    # A family with children in two classes belongs on both pages.
    it "repeats a guardian under each of their cohorts" do
      second = create(:student, school: school, school_class: infantil, name: "Ana Silva")
      create(:student_guardian, school: school, student: second, guardian: maria,
                                relationship: "mother")

      get "#{path}?columns=name", headers: headers

      expect(text_of(response.body).scan("Maria Silva").size).to be >= 2
    end
  end

  it "carries the child and the cohort when those columns are asked for" do
    get "#{path}?columns=name,student_name,student_class", headers: headers

    text = text_of(response.body)
    expect(text).to include("Pedro Silva")
    # Named in full: the letter alone repeats in every grade and both shifts.
    expect(text).to include("Ensino Fundamental I — 5º ano A · Matutino — 2026")
  end

  # A guardian with two children enrolled is two rows: folding them into one cell would make the
  # class column meaningless.
  it "gives a row per child" do
    enrol(maria, "Ana Silva")

    get "#{path}?columns=name,student_name", headers: headers

    text = text_of(response.body)
    expect(text).to include("Pedro Silva", "Ana Silva")
  end

  # They are on the register, and leaving them out would make the report disagree with the
  # listing it was printed from.
  it "keeps a guardian with no child on the roll" do
    get "#{path}?columns=name,student_name", headers: headers

    expect(text_of(response.body)).to include("Bruno Alves")
  end

  it "narrows by the same search the listing uses" do
    get "#{path}?q=Maria&columns=name", headers: headers

    text = text_of(response.body)
    expect(text).to include("Maria Silva")
    expect(text).not_to include("Bruno Alves")
  end

  # The columns arrive in a query string, so anything not on the list is dropped rather than
  # trusted.
  it "ignores a column nobody offered" do
    get "#{path}?columns=name,encrypted_password", headers: headers

    expect(response).to have_http_status(:ok)
    expect(text_of(response.body)).to include("Responsável")
  end

  it "falls back to the usual columns when none are asked for" do
    get "#{path}?columns=", headers: headers

    expect(text_of(response.body)).to include("Responsável", "CPF", "Telefone", "Filho(a)")
  end

  it "refuses a caller who may not read the register" do
    other = create(:user)
    create(:membership, user: other, school: school, role: "guardian")

    get path, headers: auth_headers_for(other)

    expect(response).to have_http_status(:forbidden)
  end
end
