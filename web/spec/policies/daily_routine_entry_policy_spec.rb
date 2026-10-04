# frozen_string_literal: true

require "rails_helper"

RSpec.describe DailyRoutineEntryPolicy do
  include PermissionsFactoryHelpers

  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:record) { build(:daily_routine_entry, school: school, student: student) }
  let(:user) { create(:user) }

  after { Current.reset }

  def create_class_teacher(assigned_class)
    teacher_user = create(:user)
    create(:membership, user: teacher_user, school: school, role: "teacher")
    teacher_record = create(:teacher, school: school, email: teacher_user.email)
    create(:teaching_assignment, school: school, teacher: teacher_record, school_class: assigned_class)
    teacher_user
  end

  def set_current!(current_user, membership)
    Current.user = current_user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
  end

  describe "the assigned teacher" do
    let(:user) { create_class_teacher(school_class) }
    let(:membership) { Membership.find_by(user: user, school: school) }

    before { set_current!(user, membership) }

    it "permits create/update/send for a student in their own assigned class" do
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
      expect(policy.send?).to be(true)
    end

    it "permits index" do
      expect(policy.index?).to be(true)
    end
  end

  describe "a different teacher, not assigned to this student's class" do
    let(:other_class) { create(:school_class, school: school, name: "B") }
    let(:user) { create_class_teacher(other_class) }
    let(:membership) { Membership.find_by(user: user, school: school) }

    before { set_current!(user, membership) }

    it "denies create/update/send (BR-DR07)" do
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.send?).to be(false)
    end
  end

  describe "staff holding manage_academic" do
    let!(:owner) { create_owner_membership(school, user: user) }
    let(:membership) { owner.last }

    before { set_current!(user, membership) }

    it "permits create/update/send regardless of assignment" do
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
      expect(policy.send?).to be(true)
    end

    it "permits index" do
      expect(policy.index?).to be(true)
    end
  end

  describe "a guardian membership" do
    let(:guardian) { create(:guardian, school: school, user: user) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
    let!(:family) { create(:student_guardian, school: school, student: student, guardian: guardian) }

    before do
      set_current!(user, membership)
      Current.guardian = guardian
    end

    it "denies create/update/send" do
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.send?).to be(false)
    end

    it "permits reading only a sent entry about their own child" do
      sent_record = build(:daily_routine_entry, :sent, school: school, student: student)
      draft_record = build(:daily_routine_entry, school: school, student: student)

      expect(described_class.new(user, sent_record).show?).to be(true)
      expect(described_class.new(user, draft_record).show?).to be(false)
    end

    it "denies reading a sent entry about a child outside their family" do
      stranger = create(:student, school: school)
      other_record = build(:daily_routine_entry, :sent, school: school, student: stranger)

      expect(described_class.new(user, other_record).show?).to be(false)
    end
  end

  describe "Scope" do
    let(:other_school) { create(:school) }
    let(:other_school_class) { create(:school_class, school: other_school) }
    let(:other_student) { create(:student, school: other_school, school_class: other_school_class) }
    let!(:other_school_entry) { create(:daily_routine_entry, school: other_school, student: other_student) }

    let!(:own_class_entry) { create(:daily_routine_entry, school: school, student: student) }

    it "scopes the assigned teacher to their own classes' students" do
      user = create_class_teacher(school_class)
      membership = Membership.find_by(user: user, school: school)
      set_current!(user, membership)

      other_class = create(:school_class, school: school, name: "B")
      unassigned_student = create(:student, school: school, school_class: other_class)
      create(:daily_routine_entry, school: school, student: unassigned_student)

      resolved = DailyRoutineEntryPolicy::Scope.new(user, DailyRoutineEntry).resolve

      expect(resolved).to contain_exactly(own_class_entry)
    end

    it "lets manage_academic staff see every entry in the school" do
      user = create(:user)
      owner = create_owner_membership(school, user: user)
      set_current!(user, owner.last)

      other_class = create(:school_class, school: school, name: "B")
      unassigned_student = create(:student, school: school, school_class: other_class)
      another_entry = create(:daily_routine_entry, school: school, student: unassigned_student)

      resolved = DailyRoutineEntryPolicy::Scope.new(user, DailyRoutineEntry).resolve

      expect(resolved).to contain_exactly(own_class_entry, another_entry)
    end

    it "scopes a guardian to sent entries about their own linked children only" do
      user = create(:user)
      guardian = create(:guardian, school: school, user: user)
      membership = create(:membership, user: user, school: school, role: "guardian")
      create(:student_guardian, school: school, student: student, guardian: guardian)
      set_current!(user, membership)
      Current.guardian = guardian

      own_class_entry.update!(status: "sent", sent_at: Time.current)

      resolved = DailyRoutineEntryPolicy::Scope.new(user, DailyRoutineEntry).resolve

      expect(resolved).to contain_exactly(own_class_entry)
    end
  end
end
