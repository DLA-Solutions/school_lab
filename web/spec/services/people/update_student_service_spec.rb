# frozen_string_literal: true

require "rails_helper"

RSpec.describe People::UpdateStudentService do
  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school) }
  let(:mother) { create(:guardian, school: school, name: "Maria Silva", cpf: "12345678909") }
  let(:father) { create(:guardian, school: school, name: "João Silva", cpf: "52998224725") }

  def enrol_with_mother
    student = create(:student, school: school, school_class: school_class, name: "Pedro")
    create(:student_guardian, school: school, student: student, guardian: mother,
                              relationship: "mother")
    student
  end

  def relationships(student)
    student.student_guardians.kept.pluck(:relationship, :guardian_id).to_h
  end

  # The form has always offered both parent fields on edit; until the update read them, a student
  # enrolled with one parent could never gain the other, and every contract went out naming one.
  it "attaches the second parent named on the form" do
    student = enrol_with_mother

    result = described_class.call(
      student: student,
      params: { name: "Pedro Silva" },
      guardian_cpfs: { father: father.cpf, mother: mother.cpf }
    )

    expect(result).to be_success
    expect(relationships(student.reload)).to eq(
      "mother" => mother.id, "father" => father.id
    )
    expect(student.name).to eq("Pedro Silva")
  end

  it "replaces a parent with the one now named in that role" do
    student = enrol_with_mother
    stepmother = create(:guardian, school: school, name: "Ana", cpf: "15852119075")

    described_class.call(
      student: student,
      params: {},
      guardian_cpfs: { father: nil, mother: stepmother.cpf }
    )

    expect(relationships(student.reload)).to eq("mother" => stepmother.id)
  end

  it "unlinks a parent whose field was cleared" do
    student = enrol_with_mother
    create(:student_guardian, school: school, student: student, guardian: father,
                              relationship: "father")

    described_class.call(
      student: student,
      params: {},
      guardian_cpfs: { father: nil, mother: mother.cpf }
    )

    expect(relationships(student.reload)).to eq("mother" => mother.id)
  end

  # A student with no responsible adult on file cannot be billed or contacted.
  it "refuses to leave a student with no guardian at all" do
    student = enrol_with_mother

    result = described_class.call(
      student: student,
      params: {},
      guardian_cpfs: { father: nil, mother: nil }
    )

    expect(result).to be_failure
    expect(result.details[:base]).to be_present
    expect(relationships(student.reload)).to eq("mother" => mother.id)
  end

  it "names the CPF that matched no guardian" do
    student = enrol_with_mother

    result = described_class.call(
      student: student,
      params: {},
      guardian_cpfs: { father: "11144477735", mother: mother.cpf }
    )

    expect(result).to be_failure
    expect(result.details[:father_cpf]).to be_present
    expect(relationships(student.reload)).to eq("mother" => mother.id)
  end

  # A rename or a status change says nothing about the parents and must not disturb them.
  it "leaves the links alone when the parents were not being edited" do
    student = enrol_with_mother

    described_class.call(student: student, params: { name: "Pedro Silva" })

    expect(relationships(student.reload)).to eq("mother" => mother.id)
  end

  # The student is renamed and the parent attached, or neither happens.
  it "rolls the rename back when a parent cannot be resolved" do
    student = enrol_with_mother

    described_class.call(
      student: student,
      params: { name: "Nome Novo" },
      guardian_cpfs: { father: "11144477735", mother: mother.cpf }
    )

    expect(student.reload.name).to eq("Pedro")
  end

  # A guardian deactivated when their last child left is brought back by the new link.
  it "reactivates a parent attached on edit" do
    student = enrol_with_mother
    father.discard

    described_class.call(
      student: student,
      params: {},
      guardian_cpfs: { father: father.cpf, mother: mother.cpf }
    )

    expect(father.reload).to be_kept
  end
end
