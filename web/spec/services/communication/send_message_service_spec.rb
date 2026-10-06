# frozen_string_literal: true

require "rails_helper"

RSpec.describe Communication::SendMessageService do
  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school) }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Lara Costa") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
  let(:portuguese) { create(:subject, school: school, name: "Português") }

  let(:sender_user) { create(:user) }
  let(:sender_guardian) { create(:guardian, school: school, user: sender_user) }
  let(:sender_membership) { create(:membership, user: sender_user, school: school, role: "guardian") }

  let(:other_user) { create(:user) }
  let(:other_guardian) { create(:guardian, school: school, user: other_user) }

  let(:secretary_user) { create(:user) }
  let(:secretary_membership) { staff_membership("secretary", user: secretary_user) }

  let(:coordination_user) { create(:user) }
  let(:coordination_membership) { staff_membership("coordination", user: coordination_user) }

  let(:director_user) { create(:user) }
  let(:director_membership) { staff_membership("director", user: director_user) }

  let(:named_teacher) { create(:teacher, school: school) }
  let(:named_teacher_user) { create(:user, email: named_teacher.email) }
  let(:named_teacher_membership) do
    create(:membership, user: named_teacher_user, school: school, role: "teacher")
  end

  let(:other_teacher) { create(:teacher, school: school) }
  let(:other_teacher_user) { create(:user, email: other_teacher.email) }
  let(:other_teacher_membership) do
    create(:membership, user: other_teacher_user, school: school, role: "teacher")
  end

  let(:role_templates) do
    Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
  end

  before do
    create(:student_guardian, school: school, student: student, guardian: sender_guardian)
    create(:student_guardian, school: school, student: student, guardian: other_guardian)
    secretary_membership
    coordination_membership
    director_membership
    named_teacher_membership
    other_teacher_membership
    create(
      :teaching_assignment,
      school: school,
      teacher: named_teacher,
      school_class: school_class,
      subject: maths
    )
    create(
      :teaching_assignment,
      school: school,
      teacher: named_teacher,
      school_class: school_class,
      subject: portuguese
    )
    create(
      :teaching_assignment,
      school: school,
      teacher: other_teacher,
      school_class: school_class,
      subject: maths
    )
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

  def send_message(
    membership: sender_membership,
    audience: "secretary",
    teacher_id: nil,
    body: "Pode buscar mais cedo",
    student_id: student.id
  )
    described_class.call(
      school: school,
      actor_membership: membership,
      student_id: student_id,
      audience: audience,
      teacher_id: teacher_id,
      body: body
    )
  end

  def message_bells(conversation)
    Notification.where(kind: "message", conversation_id: conversation.id)
  end

  describe "a linked guardian writing to the secretary" do
    it "opens one conversation and rings everyone who can see it except the sender" do
      result = send_message(audience: "secretary", teacher_id: named_teacher.id, body: "  Pode buscar mais cedo  ")

      expect(result).to be_success
      conversation = result.data[:conversation]
      message = result.data[:message]

      expect(Conversation.where(school: school, student: student, audience: "secretary").count).to eq(1)
      expect(conversation.teacher_id).to be_nil
      expect(conversation.audience).to eq("secretary")
      expect(message.body).to eq("Pode buscar mais cedo")
      expect(message.sender_membership).to eq(sender_membership)
      expect(conversation.last_message_at).to eq(message.sent_at)

      bells = message_bells(conversation)
      expect(bells.pluck(:user_id)).to contain_exactly(
        other_user.id,
        secretary_user.id,
        coordination_user.id,
        director_user.id
      )
      expect(bells).to all(
        have_attributes(
          kind: "message",
          school_id: school.id,
          conversation_id: conversation.id,
          title: I18n.t("notifications.message.title"),
          body: I18n.t("notifications.message.body", student: student.name)
        )
      )
      expect(bells.pluck(:body)).not_to include("Pode buscar mais cedo")
      expect(bells.pluck(:user_id)).not_to include(sender_user.id, named_teacher_user.id, other_teacher_user.id)
    end
  end

  describe "a linked guardian writing to coordination" do
    it "rings the other guardian, coordination, and director, and skips the secretary" do
      result = send_message(audience: "coordination")

      expect(result).to be_success
      expect(message_bells(result.data[:conversation]).pluck(:user_id)).to contain_exactly(
        other_user.id,
        coordination_user.id,
        director_user.id
      )
    end
  end

  describe "a linked guardian writing to a teacher of the current class" do
    it "keeps one conversation when that teacher holds two subjects and rings that teacher only" do
      expect(named_teacher.teaching_assignments.kept.where(school_class: school_class).count).to eq(2)

      result = send_message(audience: "teacher", teacher_id: named_teacher.id)

      expect(result).to be_success
      conversation = result.data[:conversation]
      expect(Conversation.where(school: school, student: student, audience: "teacher").count).to eq(1)
      expect(conversation.teacher_id).to eq(named_teacher.id)
      expect(message_bells(conversation).pluck(:user_id)).to contain_exactly(
        other_user.id,
        named_teacher_user.id,
        coordination_user.id,
        director_user.id
      )
    end
  end

  describe "a second send to the same teacher" do
    it "appends a message on the same conversation" do
      first = send_message(audience: "teacher", teacher_id: named_teacher.id, body: "Primeira")
      second = send_message(audience: "teacher", teacher_id: named_teacher.id, body: "Segunda")

      expect(second).to be_success
      expect(second.data[:conversation].id).to eq(first.data[:conversation].id)
      expect(Conversation.where(school: school, student: student, audience: "teacher").count).to eq(1)
      expect(Message.where(conversation_id: first.data[:conversation].id).order(:sent_at).pluck(:body))
        .to eq(%w[Primeira Segunda])
      expect(second.data[:conversation].reload.last_message_at).to eq(second.data[:message].sent_at)
    end
  end

  describe "a blank body" do
    it "returns empty_content and writes nothing" do
      result = nil

      expect {
        result = send_message(body: "   ")
      }.not_to change { [ Conversation.count, Message.count, Notification.count ] }

      expect(result).to be_failure
      expect(result.error_code).to eq(:empty_content)
    end
  end

  describe "a teacher who does not teach the child's current class" do
    it "returns teacher_not_assigned and creates no conversation" do
      other_class = create(:school_class, school: school)
      outsider = create(:teacher, school: school)
      create(:teaching_assignment, school: school, teacher: outsider, school_class: other_class, subject: maths)

      result = nil

      expect {
        result = send_message(audience: "teacher", teacher_id: outsider.id)
      }.not_to change { [ Conversation.count, Message.count, Notification.count ] }

      expect(result).to be_failure
      expect(result.error_code).to eq(:teacher_not_assigned)
    end
  end

  describe "a guardian who is not linked to the student" do
    it "returns not_found and creates no conversation" do
      other_child = create(:student, school: school, school_class: school_class)
      stranger_user = create(:user)
      stranger_guardian = create(:guardian, school: school, user: stranger_user)
      stranger_membership = create(:membership, user: stranger_user, school: school, role: "guardian")
      create(:student_guardian, school: school, student: other_child, guardian: stranger_guardian)

      result = nil

      expect {
        result = send_message(membership: stranger_membership, audience: "secretary")
      }.not_to change { [ Conversation.count, Message.count, Notification.count ] }

      expect(result).to be_failure
      expect(result.error_code).to eq(:not_found)
    end
  end

  describe "a secretary posting to a teacher" do
    it "returns not_found and creates no conversation" do
      result = nil

      expect {
        result = send_message(
          membership: secretary_membership,
          audience: "teacher",
          teacher_id: named_teacher.id
        )
      }.not_to change { [ Conversation.count, Message.count, Notification.count ] }

      expect(result).to be_failure
      expect(result.error_code).to eq(:not_found)
    end
  end
end
