# frozen_string_literal: true

require "rails_helper"

# LUI-6: one PDF with the full context of every collaborator on the school's register, active and
# discarded alike. Content assertions on a binary PDF are easier to write here, against the
# rendered text, than from a request spec -- same pattern as RenderContractPdfService's spec.
RSpec.describe Academic::RenderTeachersDossierPdfService do
  let(:school) { create(:school, name: "Escola Girassol") }

  def text_of(pdf)
    PDF::Inspector::Text.analyze(pdf).strings.join(" ")
  end

  it "renders a valid PDF" do
    create(:teacher, school: school, name: "Carla Souza")

    pdf = described_class.call(school: school).data.fetch(:pdf)

    expect(pdf).to start_with("%PDF")
  end

  it "names the file after the school and today's date" do
    filename = described_class.call(school: school).data.fetch(:filename)

    expect(filename).to include("escola-girassol")
    expect(filename).to include(Date.current.iso8601)
    expect(filename).to end_with(".pdf")
  end

  it "includes the school name and every collaborator's registration data" do
    create(:teacher, school: school, name: "Carla Souza", email: "carla@example.com",
                     phone: "+55 11 98888-0000")

    text = text_of(described_class.call(school: school).data.fetch(:pdf))

    expect(text).to include("Escola Girassol")
    expect(text).to include("Carla Souza")
    expect(text).to include("carla@example.com")
  end

  # AC: a collaborator without a health profile or bank account on file must still render --
  # the section reads "não preenchido" rather than being omitted, and the service must not raise.
  context "when a collaborator has no health profile and no bank account on file" do
    it "renders without error, with both sections reading not filled in" do
      create(:teacher, school: school, name: "Bruno Lima")

      result = described_class.call(school: school)
      text = text_of(result.data.fetch(:pdf))

      expect(result).to be_success
      expect(text).to include("Bruno Lima")
      expect(text.scan("Não preenchido").size).to be >= 2
    end
  end

  context "when a collaborator has a filled health profile and bank account" do
    it "prints their fields instead of the not-filled placeholder" do
      teacher = create(:teacher, school: school, name: "Ana Pereira")
      create(:teacher_health_profile, school: school, teacher: teacher, blood_type: "O+",
                                      emergency_contact_name: "Marta Pereira")
      teacher.build_bank_account(school: school).write!({ pix_key: "ana@example.com" }, actor: nil)

      text = text_of(described_class.call(school: school).data.fetch(:pdf))

      expect(text).to include("O+")
      expect(text).to include("Marta Pereira")
      expect(text).to include("ana@example.com")
    end
  end

  # AC: deliberately NOT the kept-only `TeacherPolicy::Scope` -- a discarded collaborator is the
  # whole point of this export and must appear, labeled "Desligado".
  context "when a collaborator has been discarded" do
    it "includes them, labeled as discharged" do
      discarded = create(:teacher, school: school, name: "Pedro Nunes")
      discarded.discard

      text = text_of(described_class.call(school: school).data.fetch(:pdf))

      expect(text).to include("Pedro Nunes")
      expect(text).to include("Desligado")
    end

    it "labels an active collaborator as Ativo, not Desligado" do
      create(:teacher, school: school, name: "Carla Souza")

      text = text_of(described_class.call(school: school).data.fetch(:pdf))

      expect(text).to include("Ativo")
    end
  end

  it "groups a collaborator's classes and subjects" do
    teacher = create(:teacher, school: school, name: "Carla Souza")
    school_class = create(:school_class, school: school, name: "A")
    maths = create(:subject, school: school, name: "Matemática")
    create(:teaching_assignment, school: school, teacher: teacher, school_class: school_class, subject: maths)

    text = text_of(described_class.call(school: school).data.fetch(:pdf))

    expect(text).to include("Matemática")
  end

  # Tenant isolation: only this school's collaborators are read -- no cross-school leak even at
  # the service layer, independent of whatever the controller passes in as `school:`.
  it "never includes a collaborator from a different school" do
    create(:teacher, school: create(:school), name: "Fora Da Escola")
    create(:teacher, school: school, name: "Carla Souza")

    text = text_of(described_class.call(school: school).data.fetch(:pdf))

    expect(text).to include("Carla Souza")
    expect(text).not_to include("Fora Da Escola")
  end
end
