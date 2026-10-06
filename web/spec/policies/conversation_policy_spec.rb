# frozen_string_literal: true

require "rails_helper"

RSpec.describe ConversationPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
  let(:user) { create(:user) }
  let(:record) { create(:conversation, school: school, student: student) }

  after { Current.reset }

  def set_current!(membership, school: membership.school)
    Current.user = membership.user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
    Current.guardian = nil
  end

  def staff_membership!(actor, system_key)
    membership = create(:membership, :staff, user: actor, school: school)
    templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
    create(:staff_profile, membership: membership, school: school, role_template: templates.fetch(system_key))
    membership
  end

  def resolved_for(actor)
    described_class::Scope.new(actor, Conversation.all).resolve
  end

  describe "linked guardians" do
    let(:guardian) { create(:guardian, school: school, user: user) }
    let(:other_user) { create(:user) }
    let(:other_guardian) { create(:guardian, school: school, user: other_user) }
    let(:other_child) { create(:student, school: school, school_class: school_class) }
    let(:named_teacher) { create(:teacher, school: school) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
    let!(:other_membership) { create(:membership, user: other_user, school: school, role: "guardian") }
    let!(:coordination_thread) { create(:conversation, school: school, student: student) }
    let!(:secretary_thread) { create(:conversation, :secretary, school: school, student: student) }
    let!(:teacher_thread) do
      create(:conversation, :with_teacher, school: school, student: student, teacher: named_teacher)
    end
    let!(:other_family_thread) { create(:conversation, school: school, student: other_child) }
    let!(:other_school_thread) { create(:conversation) }
    let(:record) { coordination_thread }

    before do
      create(:student_guardian, school: school, student: student, guardian: guardian)
      create(:student_guardian, school: school, student: other_child, guardian: other_guardian)
      set_current!(membership)
    end

    it "sees every conversation of the linked child and permits the inbox" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(described_class.new(user, secretary_thread).show?).to be(true)
      expect(described_class.new(user, teacher_thread).show?).to be(true)
      expect(resolved_for(user)).to contain_exactly(coordination_thread, secretary_thread, teacher_thread)
    end

    it "hides another family's conversations" do
      set_current!(other_membership)

      expect(described_class.new(other_user, coordination_thread).show?).to be(false)
      expect(described_class.new(other_user, secretary_thread).show?).to be(false)
      expect(described_class.new(other_user, teacher_thread).show?).to be(false)
      expect(resolved_for(other_user)).to contain_exactly(other_family_thread)
      expect(resolved_for(other_user)).not_to include(other_school_thread)
    end

    it "hides a conversation from another school" do
      expect(described_class.new(user, other_school_thread).show?).to be(false)
      expect(resolved_for(user)).not_to include(other_school_thread)
    end

    it "drops the child's conversations when the guardian link is discarded" do
      StudentGuardian.kept.find_by!(guardian: guardian, student: student).discard

      expect(policy.show?).to be(false)
      expect(policy.index?).to be(true)
      expect(resolved_for(user)).to be_empty
    end

    it "still permits the inbox when the guardian has no links" do
      unlinked = create(:user)
      membership = create(:membership, user: unlinked, school: school, role: "guardian")
      set_current!(membership)

      expect(described_class.new(unlinked, Conversation).index?).to be(true)
      expect(described_class.new(unlinked, Conversation).destinations?).to be(true)
      expect(resolved_for(unlinked)).to be_empty
    end

    it "does not authorize sending on the conversation" do
      expect(policy.create?).to be(false)
    end
  end

  describe "secretary" do
    let!(:membership) { staff_membership!(user, "secretary") }
    let!(:secretary_thread) { create(:conversation, :secretary, school: school, student: student) }
    let!(:teacher_thread) { create(:conversation, :with_teacher, school: school, student: student) }
    let!(:coordination_thread) { create(:conversation, school: school, student: student) }
    let(:other_student) { create(:student, school: school, school_class: school_class) }
    let!(:other_secretary_thread) { create(:conversation, :secretary, school: school, student: other_student) }
    let(:record) { secretary_thread }

    before { set_current!(membership) }

    it "sees only secretary conversations in the school" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(described_class.new(user, teacher_thread).show?).to be(false)
      expect(described_class.new(user, coordination_thread).show?).to be(false)
      expect(policy.destinations?).to be(false)
      expect(resolved_for(user)).to contain_exactly(secretary_thread, other_secretary_thread)
    end
  end

  describe "teacher role limited to the current class assignment" do
    let(:teacher_a) { create(:teacher, school: school, email: "ana.teacher@example.com", name: "Ana Lima") }
    let(:teacher_b) { create(:teacher, school: school, email: "bruno.teacher@example.com", name: "Bruno Lima") }
    let(:user) { create(:user, email: teacher_a.email) }
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }
    let!(:assignment) do
      create(:teaching_assignment, school: school, teacher: teacher_a, school_class: school_class, subject: maths)
    end
    let!(:own_thread) { create(:conversation, :with_teacher, school: school, student: student, teacher: teacher_a) }
    let!(:other_thread) { create(:conversation, :with_teacher, school: school, student: student, teacher: teacher_b) }
    let!(:secretary_thread) { create(:conversation, :secretary, school: school, student: student) }
    let(:coordination_user) { create(:user) }
    let!(:coordination_membership) { staff_membership!(coordination_user, "coordination") }
    let(:record) { own_thread }

    before do
      templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
      create(:staff_profile, membership: membership, school: school, role_template: templates.fetch("teacher"))
      set_current!(membership)
    end

    it "sees only that teacher's conversation while assigned to the child's current class" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(described_class.new(user, other_thread).show?).to be(false)
      expect(described_class.new(user, secretary_thread).show?).to be(false)
      expect(policy.destinations?).to be(false)
      expect(resolved_for(user)).to contain_exactly(own_thread)
    end

    it "hides the thread after the assignment is discarded, while coordination still sees it" do
      assignment.discard

      expect(described_class.new(user, own_thread).show?).to be(false)
      expect(policy.index?).to be(true)
      expect(resolved_for(user)).not_to include(own_thread)

      set_current!(coordination_membership)

      expect(described_class.new(coordination_user, own_thread).show?).to be(true)
      expect(resolved_for(coordination_user)).to include(own_thread)
    end

    it "hides the thread when the child moves to a class the teacher is not assigned to" do
      moved_class = create(:school_class, school: school, year: 2026)
      student.update!(school_class: moved_class)

      expect(described_class.new(user, own_thread).show?).to be(false)
      expect(resolved_for(user)).not_to include(own_thread)
    end
  end

  describe "coordination and director" do
    let(:named_teacher) { create(:teacher, school: school, email: "class.teacher@example.com") }
    let!(:secretary_thread) { create(:conversation, :secretary, school: school, student: student) }
    let!(:coordination_thread) { create(:conversation, school: school, student: student) }
    let!(:teacher_thread) do
      create(:conversation, :with_teacher, school: school, student: student, teacher: named_teacher)
    end
    let!(:other_school_thread) { create(:conversation) }

    before do
      create(:teaching_assignment, school: school, teacher: named_teacher, school_class: school_class, subject: maths)
    end

    it "lets coordination read every audience in the school, including when the email matches a teacher" do
      actor = create(:user, email: named_teacher.email)
      membership = staff_membership!(actor, "coordination")
      set_current!(membership)

      expect(described_class.new(actor, secretary_thread).show?).to be(true)
      expect(described_class.new(actor, coordination_thread).show?).to be(true)
      expect(described_class.new(actor, teacher_thread).show?).to be(true)
      expect(described_class.new(actor, other_school_thread).show?).to be(false)
      expect(described_class.new(actor, Conversation).index?).to be(true)
      expect(described_class.new(actor, Conversation).destinations?).to be(false)
      expect(resolved_for(actor)).to contain_exactly(secretary_thread, coordination_thread, teacher_thread)
    end

    it "lets a director read every audience in the school" do
      actor = create(:user)
      membership = staff_membership!(actor, "director")
      set_current!(membership)

      expect(described_class.new(actor, secretary_thread).show?).to be(true)
      expect(described_class.new(actor, coordination_thread).show?).to be(true)
      expect(described_class.new(actor, teacher_thread).show?).to be(true)
      expect(described_class.new(actor, other_school_thread).show?).to be(false)
      expect(described_class.new(actor, Conversation).index?).to be(true)
      expect(described_class.new(actor, Conversation).destinations?).to be(false)
      expect(resolved_for(actor)).to contain_exactly(secretary_thread, coordination_thread, teacher_thread)
    end
  end

  describe "staff membership that is neither secretary, coordination, nor director" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let!(:secretary_thread) { create(:conversation, :secretary, school: school, student: student) }

    before do
      template = create(:school_role_template, school: school)
      create(:role_template_permission,
             school: school, role_template: template, permission_key: "moderate_messages", scope_kind: "full")
      create(:staff_profile, membership: membership, school: school, role_template: template)
      set_current!(membership)
    end

    it "is denied the inbox and sees nothing" do
      expect(policy.index?).to be(false)
      expect(policy.show?).to be(false)
      expect(policy.destinations?).to be(false)
      expect(policy.create?).to be(false)
      expect(resolved_for(user)).to be_empty
      expect(resolved_for(user)).not_to include(secretary_thread)
    end
  end

  describe "inactive or discarded membership" do
    let!(:thread) { create(:conversation, school: school, student: student) }

    it "denies a suspended guardian" do
      actor = create(:user)
      membership = create(:membership, :suspended, user: actor, school: school, role: "guardian")
      set_current!(membership)

      expect(described_class.new(actor, thread).show?).to be(false)
      expect(described_class.new(actor, Conversation).index?).to be(false)
      expect(described_class.new(actor, Conversation).destinations?).to be(false)
      expect(resolved_for(actor)).to be_empty
    end

    it "denies a discarded director" do
      actor = create(:user)
      membership = staff_membership!(actor, "director")
      membership.discard
      set_current!(membership)

      expect(described_class.new(actor, thread).show?).to be(false)
      expect(described_class.new(actor, Conversation).index?).to be(false)
      expect(resolved_for(actor)).to be_empty
    end
  end
end
