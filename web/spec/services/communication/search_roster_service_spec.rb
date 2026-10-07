# frozen_string_literal: true

require "rails_helper"

RSpec.describe Communication::SearchRosterService do
  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school) }
  let(:other_class) { create(:school_class, school: school) }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Lara Costa") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }

  let(:teacher) { create(:teacher, school: school, name: "Ana Lima") }
  let(:teacher_user) { create(:user, email: teacher.email) }
  let(:teacher_membership) do
    create(:membership, user: teacher_user, school: school, role: "teacher")
  end

  let(:role_templates) do
    Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
  end

  before do
    create(:teaching_assignment, school: school, teacher: teacher, school_class: school_class, subject: maths)
    student
  end

  def staff_membership(system_key, user: create(:user))
    membership = create(:membership, :staff, user: user, school: school)
    create(
      :staff_profile,
      membership: membership,
      school: school,
      role_template: role_templates.fetch(system_key)
    )
    membership
  end

  def search(membership: teacher_membership, query: "Lara", search_school: school)
    described_class.call(school: search_school, actor_membership: membership, query: query)
  end

  describe "a teacher" do
    it "finds a student by name in a class they teach" do
      result = search(query: "Lara")

      expect(result).to be_success
      expect(result.data).to contain_exactly(
        have_attributes(
          student_id: student.id,
          student_name: "Lara Costa",
          school_class_id: school_class.id,
          teacher_id: teacher.id,
          destinations: nil
        )
      )
    end

    it "never returns a student from a class they do not teach" do
      create(:student, school: school, school_class: other_class, name: "Lara Souza")

      result = search(query: "Lara")

      expect(result).to be_success
      expect(result.data.map(&:student_name)).to eq([ "Lara Costa" ])
    end

    it "widens visibility across every class this teacher currently teaches, not just one" do
      create(:teaching_assignment, school: school, teacher: teacher, school_class: other_class, subject: maths)
      other_student = create(:student, school: school, school_class: other_class, name: "Lara Souza")

      result = search(query: "Lara")

      expect(result).to be_success
      expect(result.data.map(&:student_id)).to contain_exactly(student.id, other_student.id)
    end
  end

  describe "guardian-name matching" do
    let(:father) { create(:guardian, school: school, name: "Diego Costa") }

    before do
      create(:student_guardian, school: school, student: student, guardian: father, relationship: "father")
    end

    it "finds the student by a kept guardian's name" do
      result = search(query: "Diego")

      expect(result).to be_success
      row = result.data.sole
      expect(row.student_id).to eq(student.id)
      expect(row.guardians).to contain_exactly(have_attributes(name: "Diego Costa", relationship: "father"))
    end

    it "omits a discarded guardian link from the guardians field" do
      mother = create(:guardian, school: school, name: "Marina Costa")
      link = create(:student_guardian, school: school, student: student, guardian: mother, relationship: "mother")
      link.discard

      result = search(query: "Lara")

      expect(result).to be_success
      expect(result.data.sole.guardians.map(&:name)).to eq([ "Diego Costa" ])
    end

    it "does not match on a discarded guardian's name" do
      father.discard

      result = search(query: "Diego")

      expect(result).to be_success
      expect(result.data).to eq([])
    end

    it "orders guardians father, then mother, then other" do
      mother = create(:guardian, school: school, name: "Marina Costa")
      create(:student_guardian, school: school, student: student, guardian: mother, relationship: "mother")

      result = search(query: "Lara")

      expect(result).to be_success
      expect(result.data.sole.guardians.map(&:relationship)).to eq(%w[father mother])
    end
  end

  describe "a secretary" do
    it "sees any kept student in the school, including classes it does not teach" do
      other_student = create(:student, school: school, school_class: other_class, name: "Lara Souza")

      result = search(membership: staff_membership("secretary"), query: "Lara")

      expect(result).to be_success
      expect(result.data.map(&:student_id)).to contain_exactly(student.id, other_student.id)
      expect(result.data.map(&:teacher_id)).to all(be_nil)
      expect(result.data.map(&:destinations)).to all(be_nil)
    end
  end

  describe "coordination" do
    it "sees any kept student in the school" do
      result = search(membership: staff_membership("coordination"), query: "Lara")

      expect(result).to be_success
      expect(result.data.sole.student_id).to eq(student.id)
    end
  end

  describe "a director" do
    it "computes destinations per hit against that hit's own class, not one shared class" do
      other_teacher = create(:teacher, school: school, name: "Bruno Lima")
      create(:teaching_assignment, school: school, teacher: other_teacher, school_class: other_class, subject: maths)
      other_student = create(:student, school: school, school_class: other_class, name: "Lara Souza")

      result = search(membership: staff_membership("director"), query: "Lara")

      expect(result).to be_success
      by_id = result.data.index_by(&:student_id)

      expect(by_id.fetch(student.id).destinations).to match([
        have_attributes(audience: "coordination", teacher_id: nil),
        have_attributes(audience: "secretary", teacher_id: nil),
        have_attributes(audience: "teacher", teacher_id: teacher.id, name: "Ana Lima")
      ])
      expect(by_id.fetch(other_student.id).destinations).to match([
        have_attributes(audience: "coordination", teacher_id: nil),
        have_attributes(audience: "secretary", teacher_id: nil),
        have_attributes(audience: "teacher", teacher_id: other_teacher.id, name: "Bruno Lima")
      ])
      expect(result.data.map(&:conversation_id)).to all(be_nil)
      expect(result.data.map(&:sender_line)).to all(be_nil)
      expect(result.data.map(&:teacher_id)).to all(be_nil)
    end
  end

  describe "an attached conversation" do
    it "attaches only once the acting teacher's conversation has a message, same as the by-class roster" do
      conversation = create(:conversation, :with_teacher, school: school, student: student, teacher: teacher)

      quiet = search(query: "Lara")
      expect(quiet.data.sole).to have_attributes(conversation_id: nil, sender_line: nil)

      create(:message, conversation: conversation, school: school, sender_membership: teacher_membership, body: "Oi")

      spoken = search(query: "Lara")
      row = spoken.data.sole
      expect(row.conversation_id).to eq(conversation.id)
      expect(row.sender_line).to include(student.name)
    end
  end

  describe "cross-school isolation" do
    it "never returns a student from another school even with a matching name" do
      foreign_school = create(:school)
      create(:student, school: foreign_school, school_class: create(:school_class, school: foreign_school), name: "Lara Costa")

      result = search(membership: staff_membership("secretary"), query: "Lara")

      expect(result).to be_success
      expect(result.data.map(&:student_id)).to eq([ student.id ])
    end
  end

  describe "query guardrails" do
    it "returns an empty result for a blank query" do
      result = search(query: "")

      expect(result).to be_success
      expect(result.data).to eq([])
    end

    it "returns an empty result for a query under 2 characters" do
      result = search(query: "L")

      expect(result).to be_success
      expect(result.data).to eq([])
    end
  end

  describe "the result cap" do
    it "caps at 20 rows, ordered by student name" do
      membership = staff_membership("secretary")
      names = (1..25).map { |n| format("Busca %02d", n) }
      names.each { |name| create(:student, school: school, school_class: school_class, name: name) }

      result = search(membership: membership, query: "Busca")

      expect(result).to be_success
      expect(result.data.size).to eq(20)
      expect(result.data.map(&:student_name)).to eq(names.first(20))
    end
  end

  describe "a discarded student" do
    it "is omitted" do
      gone = create(:student, school: school, school_class: school_class, name: "Lara Arquivada")
      gone.discard

      result = search(membership: staff_membership("secretary"), query: "Lara")

      expect(result).to be_success
      expect(result.data.map(&:student_id)).to eq([ student.id ])
    end
  end

  describe "an actor with no roster access" do
    it "returns an empty result for a guardian membership" do
      guardian_membership = create(:membership, user: create(:user), school: school, role: "guardian")

      result = search(membership: guardian_membership, query: "Lara")

      expect(result).to be_success
      expect(result.data).to eq([])
    end
  end
end
