# frozen_string_literal: true

require "rails_helper"

RSpec.describe People::SyncGuardianActivationService do
  let(:school) { create(:school) }
  let(:actor) { create(:user) }
  let(:school_class) { create(:school_class, school: school) }
  let(:mother) { create(:guardian, school: school, name: "Maria Silva") }
  let(:father) { create(:guardian, school: school, name: "João Silva") }

  def enrol(guardians, name: "Pedro")
    student = create(:student, school: school, school_class: school_class, name: name)
    Array(guardians).each_with_index do |guardian, index|
      create(:student_guardian, school: school, student: student, guardian: guardian,
                                relationship: index.zero? ? "mother" : "father")
    end
    student
  end

  describe "when the last child leaves" do
    it "deactivates both guardians once the only child is removed" do
      student = enrol([ mother, father ])

      People::DiscardStudentService.call(student: student, actor: actor)

      expect(mother.reload).to be_discarded
      expect(father.reload).to be_discarded
    end

    # A transfer is the other way a child stops attending; the guardians follow either way.
    it "deactivates them when the only child is transferred out" do
      student = enrol([ mother, father ])

      People::UpdateStudentService.call(student: student, params: { status: "transferred" },
                                        actor: actor)

      expect(mother.reload).to be_discarded
      expect(father.reload).to be_discarded
    end

    it "records who triggered it" do
      student = enrol(mother)

      People::DiscardStudentService.call(student: student, actor: actor)

      expect(mother.reload.discarded_by).to eq(actor)
    end

    it "deactivates a single guardian when that is all the student has" do
      student = enrol(mother)

      People::DiscardStudentService.call(student: student, actor: actor)

      expect(mother.reload).to be_discarded
    end
  end

  describe "while a child is still attending" do
    it "keeps the guardians active when a sibling remains" do
      first = enrol([ mother, father ], name: "Pedro")
      enrol([ mother, father ], name: "Ana")

      People::DiscardStudentService.call(student: first, actor: actor)

      expect(mother.reload).not_to be_discarded
      expect(father.reload).not_to be_discarded
    end

    # The rule is about the guardian's own children, not the school's roll.
    it "ignores another family's child leaving" do
      enrol([ mother, father ])
      other_student = enrol(create(:guardian, school: school), name: "Outro")

      People::DiscardStudentService.call(student: other_student, actor: actor)

      expect(mother.reload).not_to be_discarded
    end

    it "leaves a guardian with no children linked alone" do
      lonely = create(:guardian, school: school)
      student = enrol(mother)

      People::DiscardStudentService.call(student: student, actor: actor)

      expect(lonely.reload).not_to be_discarded
    end
  end

  describe "when a child comes back" do
    it "reactivates the guardians once a student is enrolled again" do
      student = enrol([ mother, father ])
      People::DiscardStudentService.call(student: student, actor: actor)

      student.undiscard
      described_class.call(student: student, actor: actor)

      expect(mother.reload).not_to be_discarded
      expect(father.reload).not_to be_discarded
    end

    it "reactivates when a transferred student returns to active" do
      student = enrol(mother)
      People::UpdateStudentService.call(student: student, params: { status: "transferred" },
                                        actor: actor)
      expect(mother.reload).to be_discarded

      People::UpdateStudentService.call(student: student, params: { status: "active" },
                                        actor: actor)

      expect(mother.reload).not_to be_discarded
    end

    it "clears who deactivated them" do
      student = enrol(mother)
      People::DiscardStudentService.call(student: student, actor: actor)

      student.undiscard
      described_class.call(student: student)

      expect(mother.reload.discarded_by).to be_nil
    end
  end

  # Enrolling a new child has to find the guardian who was deactivated when the last one left,
  # otherwise their CPF would read as unknown and the family could not be registered again.
  describe "enrolling a new child under a deactivated guardian's CPF" do
    it "finds them by CPF and brings them back" do
      student = enrol(mother)
      People::DiscardStudentService.call(student: student, actor: actor)
      expect(mother.reload).to be_discarded

      result = People::CreateStudentService.call(
        school: school,
        params: { name: "Ana", cpf: "158.521.190-75", rg: "MG-1",
                  birth_date: Date.new(2016, 5, 2), school_class: school_class },
        guardian_cpfs: { mother: mother.cpf }
      )

      expect(result).to be_success
      expect(mother.reload).not_to be_discarded
    end

    # A live guardian must win over a discarded namesake of the same document.
    it "prefers an active guardian over a deactivated one" do
      old_student = enrol(mother)
      People::DiscardStudentService.call(student: old_student, actor: actor)

      active = create(:guardian, school: school, cpf: mother.cpf, name: "Maria Atual")

      result = People::CreateStudentService.call(
        school: school,
        params: { name: "Ana", cpf: "158.521.190-75", rg: "MG-1",
                  birth_date: Date.new(2016, 5, 2), school_class: school_class },
        guardian_cpfs: { mother: mother.cpf }
      )

      expect(result).to be_success
      expect(result.data.guardians).to include(active)
      expect(result.data.guardians).not_to include(mother)
    end
  end

  # A guardian record that predates a later rule must not be able to block a student's transfer.
  it "deactivates a guardian whose own record no longer validates" do
    student = enrol(mother)
    mother.update_columns(street: nil, city: nil, zip_code: nil)

    expect { People::DiscardStudentService.call(student: student, actor: actor) }.not_to raise_error
    expect(mother.reload).to be_discarded
  end

  it "is idempotent" do
    student = enrol(mother)
    People::DiscardStudentService.call(student: student, actor: actor)
    first = mother.reload.discarded_at

    described_class.call(student: student, actor: actor)

    expect(mother.reload.discarded_at).to eq(first)
  end
end
