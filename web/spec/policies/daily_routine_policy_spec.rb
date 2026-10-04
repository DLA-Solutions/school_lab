# frozen_string_literal: true

require "rails_helper"

RSpec.describe DailyRoutinePolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, grade_level: "infantil_1", year: 2026) }
  let(:other_class) { create(:school_class, school: school, grade_level: "infantil_2", name: "B", year: 2026) }
  let(:fundamental_class) { create(:school_class, school: school, grade_level: "fundamental_i_1", name: "C", year: 2026) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:other_student) { create(:student, school: school, school_class: other_class) }
  let(:subject_record) { create(:subject, school: school) }
  let(:user) { create(:user) }
  let(:named_teacher) { create(:teacher, school: school, email: user.email) }
  let(:author) { named_teacher }
  let(:record) do
    create(:daily_routine, school: school, school_class: school_class, student: student, author: author)
  end

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

    it "lists, reads, and writes the assigned student's card" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
      expect(policy.send?).to be(true)
      expect(policy.apply_meals?).to be(true)
      expect(policy.assignable_student?(student)).to be(true)
      expect(policy.assignable_class?(school_class)).to be(true)
      expect(described_class.new(user, school_class).apply_meals?).to be(true)
      expect(described_class.new(user, DailyRoutine).apply_meals_to?(school_class)).to be(true)
    end

    it "denies a student in another class" do
      other_card = create(:daily_routine, school: school, school_class: other_class, student: other_student,
                                          author: author, date: Date.current)

      expect(described_class.new(user, other_card).show?).to be(false)
      expect(described_class.new(user, other_card).update?).to be(false)
      expect(described_class.new(user, other_card).send?).to be(false)
      expect(policy.assignable_student?(other_student)).to be(false)
      expect(policy.apply_meals_to?(other_class)).to be(false)
      expect(described_class::Scope.new(user, DailyRoutine.all).resolve).to contain_exactly(record)
    end

    it "still answers who when the class is not infantil" do
      create(:teaching_assignment, school: school, teacher: named_teacher, school_class: fundamental_class,
                                   subject: subject_record)
      fundamental_student = create(:student, school: school, school_class: fundamental_class)

      expect(policy.assignable_class?(fundamental_class)).to be(true)
      expect(policy.apply_meals_to?(fundamental_class)).to be(true)
      expect(policy.assignable_student?(fundamental_student)).to be(true)
    end

    it "drops the card once the teaching assignment is discarded" do
      expect(policy.show?).to be(true)

      assignment.discard!

      expect(described_class.new(user, record).show?).to be(false)
      expect(described_class.new(user, record).send?).to be(false)
      expect(described_class::Scope.new(user, DailyRoutine.all).resolve).not_to include(record)
    end
  end

  describe "a teacher who also holds manage_academic" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }
    let(:other_card) do
      create(:daily_routine, school: school, school_class: other_class, student: other_student, author: author,
                             date: Date.current)
    end

    before do
      create(:teaching_assignment, school: school, teacher: named_teacher, school_class: school_class,
                                   subject: subject_record)
      grant_permission!(membership, "manage_academic")
      set_current!(membership)
    end

    it "reads the whole school and writes only assigned students" do
      expect(policy.show?).to be(true)
      expect(policy.update?).to be(true)
      expect(described_class.new(user, other_card).show?).to be(true)
      expect(described_class.new(user, other_card).update?).to be(false)
      expect(described_class.new(user, other_card).send?).to be(false)
      expect(described_class::Scope.new(user, DailyRoutine.all).resolve).to contain_exactly(record, other_card)
    end
  end

  describe "staff who hold manage_academic and are not teachers" do
    let(:user) { create(:user) }
    let(:author) { create(:teacher, school: school) }
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:sent_card) do
      create(:daily_routine, :sent, school: school, school_class: school_class, student: student, author: author,
                                    date: Date.current + 1)
    end

    before do
      grant_permission!(membership, "manage_academic")
      set_current!(membership)
    end

    it "reads every card in the school and cannot write" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(described_class.new(user, sent_card).show?).to be(true)
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.send?).to be(false)
      expect(policy.apply_meals?).to be(false)
      expect(policy.apply_meals_to?(school_class)).to be(false)
      expect(described_class::Scope.new(user, DailyRoutine.all).resolve).to contain_exactly(record, sent_card)
    end
  end

  describe "a linked guardian" do
    let(:guardian) { create(:guardian, school: school) }
    let(:user) { create(:user) }
    let(:author) { create(:teacher, school: school) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
    let(:sent_card) do
      create(:daily_routine, :sent, school: school, school_class: school_class, student: student, author: author,
                                    date: Date.current + 1)
    end

    before do
      create(:student_guardian, school: school, student: student, guardian: guardian)
      set_current!(membership)
      Current.guardian = guardian
    end

    it "lists routines, reads only the sent card, and cannot write" do
      other_sent = create(:daily_routine, :sent, school: school, school_class: other_class, student: other_student,
                                                 author: author, date: Date.current)

      expect(policy.index?).to be(true)
      expect(policy.show?).to be(false)
      expect(described_class.new(user, sent_card).show?).to be(true)
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.send?).to be(false)
      expect(policy.apply_meals?).to be(false)
      expect(described_class::Scope.new(user, DailyRoutine.all).resolve).to contain_exactly(sent_card)
      expect(described_class::Scope.new(user, DailyRoutine.all).resolve).not_to include(record, other_sent)
    end
  end

  describe "an unlinked guardian" do
    let(:guardian) { create(:guardian, school: school) }
    let(:user) { create(:user) }
    let(:author) { create(:teacher, school: school) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    before do
      set_current!(membership)
      Current.guardian = guardian
    end

    it "does not see a sent card for someone else's child" do
      sent_card = create(:daily_routine, :sent, school: school, school_class: school_class, student: student,
                                                author: author)

      expect(described_class.new(user, sent_card).show?).to be(false)
      expect(described_class::Scope.new(user, DailyRoutine.all).resolve).to be_empty
    end
  end
end
