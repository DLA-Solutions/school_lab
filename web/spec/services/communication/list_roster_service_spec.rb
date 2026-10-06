# frozen_string_literal: true

require "rails_helper"

RSpec.describe Communication::ListRosterService do
  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school) }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Lara Costa") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
  let(:portuguese) { create(:subject, school: school, name: "Português") }

  let(:teacher) { create(:teacher, school: school, name: "Ana Lima") }
  let(:teacher_user) { create(:user, email: teacher.email) }
  let(:teacher_membership) do
    create(:membership, user: teacher_user, school: school, role: "teacher")
  end

  let(:role_templates) do
    Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
  end

  before do
    create(
      :teaching_assignment,
      school: school,
      teacher: teacher,
      school_class: school_class,
      subject: maths
    )
    create(
      :teaching_assignment,
      school: school,
      teacher: teacher,
      school_class: school_class,
      subject: portuguese
    )
    student
  end

  def staff_membership(system_key, user:)
    membership = create(:membership, :staff, user: user, school: school)
    create(
      :staff_profile,
      membership: membership,
      school: school,
      role_template: role_templates.fetch(system_key)
    )
    membership
  end

  def list_roster(membership: teacher_membership, school_class_id: school_class.id, roster_school: school)
    described_class.call(
      school: roster_school,
      actor_membership: membership,
      school_class_id: school_class_id
    )
  end

  def conversation_with_message(audience:, sender:, teacher: nil, body: "Bom dia")
    conversation = create(
      :conversation,
      school: school,
      student: student,
      audience: audience,
      teacher: teacher
    )
    create(
      :message,
      conversation: conversation,
      school: school,
      sender_membership: sender,
      body: body
    )
    conversation
  end

  describe "a teacher of the class" do
    it "returns the student with no conversation line when nobody has written" do
      result = list_roster

      expect(result).to be_success
      expect(result.data).to contain_exactly(
        have_attributes(
          student_id: student.id,
          student_name: "Lara Costa",
          school_class_id: school_class.id,
          conversation_id: nil,
          sender_line: nil,
          teacher_id: teacher.id,
          destinations: nil
        )
      )
    end

    it "leaves the conversation id and sender line nil when the teacher conversation has no message" do
      create(:conversation, :with_teacher, school: school, student: student, teacher: teacher)

      result = list_roster

      expect(result).to be_success
      expect(result.data.sole).to have_attributes(
        conversation_id: nil,
        sender_line: nil,
        teacher_id: teacher.id
      )
    end

    it "returns the conversation id and sender line after a message exists" do
      conversation = conversation_with_message(
        audience: "teacher",
        teacher: teacher,
        sender: teacher_membership
      )

      result = list_roster

      expect(result).to be_success
      row = result.data.sole
      expect(row.conversation_id).to eq(conversation.id)
      expect(row.sender_line).to include(student.name)
    end
  end

  describe "a teacher of another class" do
    it "does not find the class" do
      other_class = create(:school_class, school: school)
      create(:student, school: school, school_class: other_class)

      result = list_roster(school_class_id: other_class.id)

      expect(result).to be_failure
      expect(result.error_code).to eq(:not_found)
    end
  end

  describe "a class in another school" do
    it "is not found" do
      foreign_class = create(:school_class, school: create(:school))

      result = list_roster(school_class_id: foreign_class.id)

      expect(result).to be_failure
      expect(result.error_code).to eq(:not_found)
    end
  end

  describe "a secretary" do
    let(:secretary_membership) { staff_membership("secretary", user: create(:user)) }

    it "returns the student and attaches the secretary conversation only after it has a message" do
      teacher_conversation = conversation_with_message(
        audience: "teacher",
        teacher: teacher,
        sender: teacher_membership
      )
      secretary_conversation = create(:conversation, :secretary, school: school, student: student)

      quiet = list_roster(membership: secretary_membership)

      expect(quiet).to be_success
      expect(quiet.data.sole).to have_attributes(
        student_id: student.id,
        student_name: "Lara Costa",
        conversation_id: nil,
        sender_line: nil,
        teacher_id: nil,
        destinations: nil
      )

      create(
        :message,
        conversation: secretary_conversation,
        school: school,
        sender_membership: secretary_membership,
        body: "Pode buscar"
      )

      spoken = list_roster(membership: secretary_membership)
      row = spoken.data.sole
      expect(row.conversation_id).to eq(secretary_conversation.id)
      expect(row.sender_line).to include(student.name)
      expect(row.conversation_id).not_to eq(teacher_conversation.id)
    end
  end

  describe "coordination whose email matches a teacher" do
    it "attaches the coordination conversation, not the teacher thread" do
      coordinator = create(:user, email: teacher.email)
      membership = staff_membership("coordination", user: coordinator)
      teacher_conversation = conversation_with_message(
        audience: "teacher",
        teacher: teacher,
        sender: membership
      )
      coordination_conversation = conversation_with_message(
        audience: "coordination",
        sender: membership,
        body: "Da coordenação"
      )

      result = list_roster(membership: membership)

      expect(result).to be_success
      row = result.data.sole
      expect(row.conversation_id).to eq(coordination_conversation.id)
      expect(row.sender_line).to include(student.name)
      expect(row.conversation_id).not_to eq(teacher_conversation.id)
      expect(row.teacher_id).to be_nil
      expect(row.destinations).to be_nil
    end
  end

  describe "a director" do
    let(:director_membership) { staff_membership("director", user: create(:user)) }

    it "never attaches a conversation and lists each class teacher once" do
      expect(teacher.teaching_assignments.kept.where(school_class: school_class).count).to eq(2)
      create(:student, school: school, school_class: school_class, name: "Bruno Alves")
      conversation_with_message(audience: "teacher", teacher: teacher, sender: teacher_membership)
      conversation_with_message(audience: "coordination", sender: director_membership, body: "Da direção")

      result = list_roster(membership: director_membership)

      expect(result).to be_success
      expect(result.data.map(&:student_name)).to eq([ "Bruno Alves", "Lara Costa" ])
      expect(result.data.map(&:conversation_id)).to all(be_nil)
      expect(result.data.map(&:sender_line)).to all(be_nil)
      expect(result.data.map(&:teacher_id)).to all(be_nil)
      expect(result.data.first.destinations).to equal(result.data.second.destinations)
      expect(result.data.first.destinations).to match([
        have_attributes(audience: "coordination", teacher_id: nil, name: nil),
        have_attributes(audience: "secretary", teacher_id: nil, name: nil),
        have_attributes(audience: "teacher", teacher_id: teacher.id, name: "Ana Lima")
      ])
    end

    it "omits the teacher object when the class has no teacher" do
      vacant = create(:school_class, school: school)
      create(:student, school: school, school_class: vacant, name: "Sem Professor")

      result = list_roster(membership: director_membership, school_class_id: vacant.id)

      expect(result).to be_success
      expect(result.data.sole.conversation_id).to be_nil
      expect(result.data.sole.sender_line).to be_nil
      expect(result.data.sole.destinations.map(&:audience)).to eq(%w[coordination secretary])
    end
  end

  describe "an empty class the teacher is assigned to" do
    it "succeeds with an empty list" do
      vacant = create(:school_class, school: school)
      create(:teaching_assignment, school: school, teacher: teacher, school_class: vacant, subject: maths)

      result = list_roster(school_class_id: vacant.id)

      expect(result).to be_success
      expect(result.data).to eq([])
    end
  end

  describe "a discarded student" do
    it "is omitted" do
      gone = create(:student, school: school, school_class: school_class, name: "Arquivado")
      gone.discard

      result = list_roster

      expect(result).to be_success
      expect(result.data.map(&:student_id)).to eq([ student.id ])
    end
  end
end
