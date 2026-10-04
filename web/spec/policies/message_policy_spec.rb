# frozen_string_literal: true

require "rails_helper"

RSpec.describe MessagePolicy do
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
  let(:record) { create(:message, conversation: conversation, school: school, sender_membership: membership) }

  after { Current.reset }

  def set_current!(membership, school: membership.school)
    Current.user = membership.user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
    Current.guardian = nil
  end

  describe "an assigned teacher" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    before do
      create(:teaching_assignment, school: school, teacher: named_teacher, school_class: school_class,
                                   subject: subject_record)
      set_current!(membership)
    end

    it "permits list, show, and create on the assigned student's thread" do
      unsaved = build(:message, conversation: conversation, school: school, sender_membership: membership)

      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(described_class.new(user, unsaved).create?).to be(true)
    end

    it "refuses update and destroy" do
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
    end

    it "denies a message on another class's thread and leaves it out of scope" do
      other_conversation = create(:conversation, school: school, student: other_student)
      hidden = create(:message, conversation: other_conversation, school: school, sender_membership: membership)

      expect(described_class.new(user, hidden).show?).to be(false)
      expect(described_class.new(user, hidden).create?).to be(false)
      expect(described_class::Scope.new(user, Message.all).resolve).to contain_exactly(record)
    end
  end

  describe "a linked guardian" do
    let(:guardian) { create(:guardian, school: school) }
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    before do
      create(:student_guardian, school: school, student: student, guardian: guardian)
      set_current!(membership)
      Current.guardian = guardian
    end

    it "permits show and create on the linked child's thread" do
      expect(policy.show?).to be(true)
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
    end

    it "denies another family's message" do
      other_conversation = create(:conversation, school: school, student: other_student)
      hidden = create(:message, conversation: other_conversation, school: school, sender_membership: membership)

      expect(described_class.new(user, hidden).show?).to be(false)
      expect(described_class::Scope.new(user, Message.all).resolve).to contain_exactly(record)
    end
  end

  describe "an unlinked guardian" do
    let(:guardian) { create(:guardian, school: school) }
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    before do
      set_current!(membership)
      Current.guardian = guardian
    end

    it "is denied the message and the scope" do
      expect(policy.show?).to be(false)
      expect(policy.create?).to be(false)
      expect(described_class::Scope.new(user, Message.all).resolve).to be_empty
    end
  end

  describe "staff who hold manage_academic and are not teachers" do
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, :staff, user: user, school: school) }

    before do
      template = create(:school_role_template, school: school)
      create(:role_template_permission, school: school, role_template: template,
                                        permission_key: "manage_academic", scope_kind: "full")
      create(:staff_profile, membership: membership, school: school, role_template: template)
      set_current!(membership)
    end

    it "cannot read the message" do
      expect(policy.show?).to be(false)
      expect(policy.index?).to be(false)
      expect(described_class::Scope.new(user, Message.all).resolve).to be_empty
    end
  end
end
