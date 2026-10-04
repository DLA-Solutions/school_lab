# frozen_string_literal: true

require "rails_helper"

RSpec.describe ConversationPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, grade_level: "infantil_1", year: 2026) }
  let(:other_class) { create(:school_class, school: school, grade_level: "infantil_2", name: "B", year: 2026) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:other_student) { create(:student, school: school, school_class: other_class) }
  let(:subject_record) { create(:subject, school: school) }
  let(:user) { create(:user) }
  let(:named_teacher) { create(:teacher, school: school, email: user.email) }
  let(:record) { create(:conversation, school: school, student: student) }

  after { Current.reset }

  def set_current!(membership, school: membership.school)
    Current.user = membership.user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
    Current.guardian = nil
  end

  def grant_permission!(membership, key)
    template = create(:school_role_template, school: school)
    create(:role_template_permission, school: school, role_template: template, permission_key: key, scope_kind: "full")
    create(:staff_profile, membership: membership, school: school, role_template: template)
  end

  describe "an assigned teacher" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }
    let!(:assignment) do
      create(:teaching_assignment, school: school, teacher: named_teacher, school_class: school_class,
                                   subject: subject_record)
    end

    before { set_current!(membership) }

    it "lists threads and reads and posts on the assigned student's thread" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(policy.post?).to be(true)
      expect(policy.visible_student?(student)).to be(true)
      expect(policy.class_notice?(school_class)).to be(true)
    end

    it "does not open a standalone create, update, or destroy" do
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
    end

    it "denies a student in a class this teacher does not teach" do
      other_thread = create(:conversation, school: school, student: other_student)

      expect(described_class.new(user, other_thread).show?).to be(false)
      expect(described_class.new(user, other_thread).post?).to be(false)
      expect(policy.visible_student?(other_student)).to be(false)
      expect(policy.class_notice?(other_class)).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).to contain_exactly(record)
    end

    it "drops the thread from scope once the teaching assignment is discarded" do
      expect(policy.show?).to be(true)

      assignment.discard!

      expect(described_class.new(user, record).show?).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).not_to include(record)
    end

    it "omits a discarded thread" do
      record.discard!

      expect(policy.show?).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).to be_empty
    end

    it "excludes another school's thread" do
      other_school = create(:school)
      foreign_student = create(:student, school: other_school)
      foreign_thread = create(:conversation, school: other_school, student: foreign_student)

      expect(described_class.new(user, foreign_thread).show?).to be(false)
      expect(policy.visible_student?(foreign_student)).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).not_to include(foreign_thread)
    end
  end

  describe "a teacher who also holds manage_academic" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    before do
      create(:teaching_assignment, school: school, teacher: named_teacher, school_class: school_class,
                                   subject: subject_record)
      grant_permission!(membership, "manage_academic")
      set_current!(membership)
    end

    it "stays narrowed to assigned classes" do
      other_thread = create(:conversation, school: school, student: other_student)
      keys = Identity::ResolveEffectivePermissionsService.call(membership: membership).data.fetch(:keys)

      expect(keys).to include("manage_academic")
      expect(described_class.new(user, other_thread).show?).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).to contain_exactly(record)
    end
  end

  describe "a linked guardian" do
    let(:guardian) { create(:guardian, school: school) }
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
    let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }

    before do
      set_current!(membership)
      Current.guardian = guardian
    end

    it "lists, reads, and posts on the linked child's thread" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(policy.post?).to be(true)
      expect(policy.visible_student?(student)).to be(true)
      expect(policy.class_notice?(school_class)).to be(false)
      expect(policy.create?).to be(false)
    end

    it "denies another family's child" do
      other_thread = create(:conversation, school: school, student: other_student)

      expect(described_class.new(user, other_thread).show?).to be(false)
      expect(policy.visible_student?(other_student)).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).to contain_exactly(record)
    end

    it "loses the thread when the family link is discarded" do
      expect(policy.show?).to be(true)

      link.discard!

      expect(described_class.new(user, record).show?).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).not_to include(record)
    end
  end

  describe "a guardian who is not linked to the student" do
    let(:guardian) { create(:guardian, school: school) }
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    before do
      set_current!(membership)
      Current.guardian = guardian
    end

    it "is denied the thread and the scope" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(false)
      expect(policy.post?).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).to be_empty
    end
  end

  describe "staff who hold manage_academic and are not teachers" do
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, :staff, user: user, school: school) }

    before do
      grant_permission!(membership, "manage_academic")
      set_current!(membership)
    end

    it "cannot list or read a private thread" do
      keys = Identity::ResolveEffectivePermissionsService.call(membership: membership).data.fetch(:keys)

      expect(keys).to include("manage_academic")
      expect(policy.index?).to be(false)
      expect(policy.show?).to be(false)
      expect(policy.post?).to be(false)
      expect(policy.class_notice?(school_class)).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).to be_empty
    end
  end

  describe "staff who hold moderate_messages" do
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, :staff, user: user, school: school) }

    before do
      grant_permission!(membership, "moderate_messages")
      set_current!(membership)
    end

    it "cannot read a private thread" do
      keys = Identity::ResolveEffectivePermissionsService.call(membership: membership).data.fetch(:keys)

      expect(keys).to include("moderate_messages")
      expect(policy.index?).to be(false)
      expect(policy.show?).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).to be_empty
    end
  end

  describe "a suspended teacher-role membership" do
    let!(:membership) { create(:membership, :suspended, user: user, school: school, role: "teacher") }

    before do
      create(:teaching_assignment, school: school, teacher: named_teacher, school_class: school_class,
                                   subject: subject_record)
      set_current!(membership)
    end

    it "is denied" do
      expect(policy.index?).to be(false)
      expect(policy.show?).to be(false)
      expect(described_class::Scope.new(user, Conversation.all).resolve).to be_empty
    end
  end
end
