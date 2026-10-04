# frozen_string_literal: true

require "rails_helper"

RSpec.describe CommunicationAttachmentPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, grade_level: "infantil_1", year: 2026) }
  let(:other_class) { create(:school_class, school: school, grade_level: "infantil_2", name: "B", year: 2026) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:other_student) { create(:student, school: school, school_class: other_class) }
  let(:subject_record) { create(:subject, school: school) }
  let(:user) { create(:user) }
  let(:named_teacher) { create(:teacher, school: school, email: user.email) }
  let(:conversation) { create(:conversation, school: school, student: student) }
  let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }
  let(:record) { create(:communication_attachment, school: school, uploaded_by_membership: membership) }

  after { Current.reset }

  def set_current!(membership, school: membership.school)
    Current.user = membership.user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
    Current.guardian = nil
  end

  describe "an assigned teacher" do
    before do
      create(:teaching_assignment, school: school, teacher: named_teacher, school_class: school_class,
                                   subject: subject_record)
      set_current!(membership)
    end

    it "lets the uploader read an unattached file and denies a different membership" do
      other_membership = create(:membership, school: school, role: "teacher")
      other_file = create(:communication_attachment, school: school, uploaded_by_membership: other_membership)

      expect(policy.show?).to be(true)
      expect(policy.download?).to be(true)
      expect(described_class.new(user, other_file).show?).to be(false)
      expect(described_class.new(user, other_file).download?).to be(false)
    end

    it "permits upload in this school and refuses update and destroy" do
      other_school = create(:school)
      foreign = build(:communication_attachment, school: other_school, uploaded_by_membership: membership)

      expect(described_class.new(user, CommunicationAttachment).create?).to be(true)
      expect(policy.create?).to be(true)
      expect(described_class.new(user, foreign).create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
    end

    it "follows the message once the file is attached, and scopes to visible files only" do
      visible_message = create(:message, conversation: conversation, school: school, sender_membership: membership)
      hidden_conversation = create(:conversation, school: school, student: other_student)
      hidden_message = create(:message, conversation: hidden_conversation, school: school, sender_membership: membership)
      on_visible = create(:communication_attachment, school: school, uploaded_by_membership: membership,
                                                     message: visible_message)
      on_hidden = create(:communication_attachment, school: school, uploaded_by_membership: membership,
                                                    message: hidden_message)
      routine = create(:daily_routine, school: school, school_class: school_class, student: student,
                                       author: named_teacher)
      on_routine = create(:communication_attachment, school: school, uploaded_by_membership: membership,
                                                     daily_routine: routine)

      expect(described_class.new(user, on_visible).show?).to be(true)
      expect(described_class.new(user, on_hidden).show?).to be(false)
      expect(described_class.new(user, on_routine).show?).to be(true)
      expect(described_class::Scope.new(user, CommunicationAttachment.all).resolve).to contain_exactly(
        record, on_visible, on_routine
      )
    end
  end

  describe "a linked guardian" do
    let(:guardian) { create(:guardian, school: school) }
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
    let(:author) { create(:teacher, school: school) }

    before do
      create(:student_guardian, school: school, student: student, guardian: guardian)
      set_current!(membership)
      Current.guardian = guardian
    end

    it "uploads, reads its own unattached file, and reads a file on the child's sent routine only" do
      teacher_membership = create(:membership, school: school, role: "teacher")
      sent = create(:daily_routine, :sent, school: school, school_class: school_class, student: student,
                                           author: author, date: Date.current)
      draft = create(:daily_routine, school: school, school_class: school_class, student: student, author: author,
                                     date: Date.current + 1)
      on_sent = create(:communication_attachment, school: school, uploaded_by_membership: teacher_membership,
                                                  daily_routine: sent)
      on_draft = create(:communication_attachment, school: school, uploaded_by_membership: teacher_membership,
                                                   daily_routine: draft)
      visible_message = create(:message, conversation: conversation, school: school,
                                         sender_membership: teacher_membership)
      on_message = create(:communication_attachment, school: school, uploaded_by_membership: teacher_membership,
                                                     message: visible_message)

      expect(policy.create?).to be(true)
      expect(policy.show?).to be(true)
      expect(described_class.new(user, on_sent).show?).to be(true)
      expect(described_class.new(user, on_draft).show?).to be(false)
      expect(described_class.new(user, on_message).show?).to be(true)
      expect(described_class::Scope.new(user, CommunicationAttachment.all).resolve).to contain_exactly(
        record, on_sent, on_message
      )
    end
  end

  describe "staff who hold manage_academic and are not teachers" do
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:author) { create(:teacher, school: school) }

    before do
      template = create(:school_role_template, school: school)
      create(:role_template_permission, school: school, role_template: template,
                                        permission_key: "manage_academic", scope_kind: "full")
      create(:staff_profile, membership: membership, school: school, role_template: template)
      set_current!(membership)
    end

    it "cannot upload, cannot read a thread file, and can read a routine file" do
      teacher_membership = create(:membership, school: school, role: "teacher")
      message = create(:message, conversation: conversation, school: school, sender_membership: teacher_membership)
      on_message = create(:communication_attachment, school: school, uploaded_by_membership: teacher_membership,
                                                     message: message)
      routine = create(:daily_routine, school: school, school_class: school_class, student: student, author: author)
      on_routine = create(:communication_attachment, school: school, uploaded_by_membership: teacher_membership,
                                                     daily_routine: routine)
      teacher_file = create(:communication_attachment, school: school, uploaded_by_membership: teacher_membership)

      expect(policy.create?).to be(false)
      expect(described_class.new(user, on_message).show?).to be(false)
      expect(described_class.new(user, teacher_file).show?).to be(false)
      expect(described_class.new(user, on_routine).show?).to be(true)
      expect(described_class::Scope.new(user, CommunicationAttachment.all).resolve).to contain_exactly(
        record, on_routine
      )
    end
  end

  describe "staff who hold moderate_messages" do
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, :staff, user: user, school: school) }

    before do
      template = create(:school_role_template, school: school)
      create(:role_template_permission, school: school, role_template: template,
                                        permission_key: "moderate_messages", scope_kind: "full")
      create(:staff_profile, membership: membership, school: school, role_template: template)
      set_current!(membership)
    end

    it "cannot upload or read an unattached file they did not upload, nor a thread file" do
      teacher_membership = create(:membership, school: school, role: "teacher")
      message = create(:message, conversation: conversation, school: school, sender_membership: teacher_membership)
      on_message = create(:communication_attachment, school: school, uploaded_by_membership: teacher_membership,
                                                     message: message)

      expect(policy.create?).to be(false)
      expect(described_class.new(user, on_message).show?).to be(false)
    end
  end
end
