# frozen_string_literal: true

require "rails_helper"

RSpec.describe LessonPlanPolicy do
  include PermissionsFactoryHelpers

  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school) }
  let(:math_subject) { create(:subject, school: school, name: "Matemática") }
  let(:science_subject) { create(:subject, school: school, name: "Ciências") }

  let!(:math_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: math_subject)
  end
  let!(:science_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: science_subject)
  end

  let(:record) { build(:lesson_plan, school: school, class_discipline: math_discipline) }
  let(:user) { create(:user) }

  after { Current.reset }

  # Mirrors report_card_previews_spec's create_math_teacher: a user, a teacher-role membership,
  # and a Teacher record matched by email, assigned to math_discipline only.
  def create_math_teacher
    teacher_user = create(:user)
    create(:membership, user: teacher_user, school: school, role: "teacher")
    teacher_record = create(:teacher, school: school, email: teacher_user.email)
    math_discipline.update!(teacher: teacher_record)
    teacher_user
  end

  def set_current!(current_user, membership)
    Current.user = current_user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
  end

  describe "the assigned teacher" do
    let(:user) { create_math_teacher }
    let(:membership) { Membership.find_by(user: user, school: school) }

    before { set_current!(user, membership) }

    it "permits read and write for their own class_discipline's plan" do
      expect(policy.show?).to be(true)
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
    end

    it "permits index" do
      expect(policy.index?).to be(true)
    end
  end

  describe "a different teacher, not assigned to this class_discipline" do
    let(:user) { create_math_teacher }
    let(:membership) { Membership.find_by(user: user, school: school) }
    let(:record) { build(:lesson_plan, school: school, class_discipline: science_discipline) }

    before do
      other_teacher_user = create(:user)
      create(:membership, user: other_teacher_user, school: school, role: "teacher")
      other_teacher_record = create(:teacher, school: school, email: other_teacher_user.email)
      science_discipline.update!(teacher: other_teacher_record)

      set_current!(user, membership)
    end

    it "denies read and write for a class_discipline taught by someone else" do
      expect(policy.show?).to be(false)
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
    end
  end

  describe "staff holding manage_academic" do
    let!(:owner) { create_owner_membership(school, user: user) }
    let(:membership) { owner.last }

    before { set_current!(user, membership) }

    it "permits read and write regardless of class_discipline" do
      other_record = build(:lesson_plan, school: school, class_discipline: science_discipline)

      expect(policy.show?).to be(true)
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
      expect(described_class.new(user, other_record).show?).to be(true)
    end

    it "permits index" do
      expect(policy.index?).to be(true)
    end
  end

  describe "a guardian membership" do
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    before { set_current!(user, membership) }

    it "denies index" do
      expect(policy.index?).to be(false)
    end
  end

  describe "Scope" do
    let(:other_school) { create(:school) }
    let(:other_school_class) { create(:school_class, school: other_school) }
    let(:other_subject) { create(:subject, school: other_school, name: "Outra Escola") }
    let!(:other_school_discipline) do
      create(:class_discipline, school: other_school, school_class: other_school_class, subject: other_subject)
    end

    let!(:math_plan) { create(:lesson_plan, school: school, class_discipline: math_discipline) }
    let!(:science_plan) { create(:lesson_plan, school: school, class_discipline: science_discipline) }
    let!(:other_school_plan) { create(:lesson_plan, school: other_school, class_discipline: other_school_discipline) }

    context "for the assigned teacher" do
      let(:user) { create_math_teacher }
      let(:membership) { Membership.find_by(user: user, school: school) }

      before { set_current!(user, membership) }

      it "includes only plans on their own class_disciplines, excluding other schools" do
        resolved = described_class::Scope.new(user, LessonPlan.all).resolve

        expect(resolved).to contain_exactly(math_plan)
      end
    end

    context "for staff holding manage_academic" do
      let!(:owner) { create_owner_membership(school, user: user) }
      let(:membership) { owner.last }

      before { set_current!(user, membership) }

      it "includes every plan in the school, excluding other schools" do
        resolved = described_class::Scope.new(user, LessonPlan.all).resolve

        expect(resolved).to contain_exactly(math_plan, science_plan)
      end
    end
  end
end
