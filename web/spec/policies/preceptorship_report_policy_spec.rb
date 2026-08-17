# frozen_string_literal: true

require "rails_helper"

RSpec.describe PreceptorshipReportPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:other_class) { create(:school_class, school: school, name: "B", year: 2026) }
  let(:other_student) { create(:student, school: school, school_class: other_class) }
  let(:named_teacher) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }
  let(:record) { build(:preceptorship_report, school: school, student: student, teacher: named_teacher) }
  let(:user) { create(:user, email: "carla@example.com") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }

  after { Current.reset }

  def assign_teacher!(membership)
    templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
    create(:staff_profile, membership: membership, school: school, role_template: templates["teacher"])
    create(:teaching_assignment,
           school: school, teacher: named_teacher, school_class: school_class, subject: maths)
  end

  describe "teacher membership narrowed to assigned students" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    before do
      assign_teacher!(membership)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits list and create" do
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
    end

    it "permits read and mutation for an assigned student" do
      expect(policy.show?).to be(true)
      expect(policy.update?).to be(true)
      expect(policy.publish?).to be(true)
      expect(policy.assignable_student?(student)).to be(true)
    end

    it "denies read and mutation for an unassigned student" do
      other_record = build(:preceptorship_report, school: school, student: other_student, teacher: named_teacher)

      expect(described_class.new(user, other_record).show?).to be(false)
      expect(described_class.new(user, other_record).update?).to be(false)
      expect(described_class.new(user, other_record).publish?).to be(false)
      expect(policy.assignable_student?(other_student)).to be(false)
    end

    it "scopes the index to assigned students only" do
      assigned = create(:preceptorship_report, school: school, student: student, teacher: named_teacher)
      create(:preceptorship_report, school: school, student: other_student, teacher: named_teacher)

      resolved = described_class::Scope.new(user, PreceptorshipReport.all).resolve

      expect(resolved).to contain_exactly(assigned)
    end
  end

  describe "coordination staff with teach and a matching teacher record" do
    let(:user) { create(:user, email: "coord@example.com") }
    let!(:membership) { create(:membership, user: user, school: school, role: "staff") }
    let!(:coord_teacher) { create(:teacher, school: school, email: "coord@example.com", name: "Coordenação") }

    before do
      templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
      create(:staff_profile, membership: membership, school: school, role_template: templates["coordination"],
                             also_teaches: true)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "administers every same-school report" do
      other_record = build(:preceptorship_report, school: school, student: other_student, teacher: named_teacher)

      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
      expect(described_class.new(user, other_record).show?).to be(true)
      expect(policy.assignable_student?(other_student)).to be(true)
    end

    it "returns every same-school report in scope" do
      assigned = create(:preceptorship_report, school: school, student: student, teacher: named_teacher)
      unassigned = create(:preceptorship_report, school: school, student: other_student, teacher: named_teacher)

      resolved = described_class::Scope.new(user, PreceptorshipReport.all).resolve

      expect(resolved).to contain_exactly(assigned, unassigned)
    end
  end

  describe "staff with teach but no matching teacher record" do
    let(:user) { create(:user, email: "coord@example.com") }
    let!(:membership) { create(:membership, user: user, school: school, role: "staff") }

    before do
      templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
      create(:staff_profile, membership: membership, school: school, role_template: templates["coordination"],
                             also_teaches: true)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "may list but cannot assign a student for creation" do
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
      expect(policy.assignable_student?(student)).to be(false)
    end
  end
end
