# frozen_string_literal: true

require "rails_helper"

RSpec.describe IncidentPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:other_class) { create(:school_class, school: school, name: "B", year: 2026) }
  let(:other_student) { create(:student, school: school, school_class: other_class) }
  let(:named_teacher) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }
  let(:incident_type) { create(:incident_type, :guardian_meeting, school: school) }
  let(:record) { build(:incident, school: school, student: student, incident_type: incident_type) }
  let(:user) { create(:user, email: "carla@example.com") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }

  after { Current.reset }

  def set_current!(membership, school: membership.school)
    Current.user = membership.user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
    Current.guardian = nil
  end

  def assign_teacher!(membership)
    templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
    create(:staff_profile, membership: membership, school: school, role_template: templates["teacher"])
    create(:teaching_assignment,
           school: school, teacher: named_teacher, school_class: school_class, subject: maths)
  end

  # A `manage_academic`-granting role template that is deliberately NOT a system template and
  # carries no `system_key` — the AC-IN05 negative case: broad academic staff whose role template
  # is neither "coordination" nor "director".
  def create_manage_academic_only_membership!(user:)
    membership = create(:membership, :staff, user: user, school: school)
    custom_template = create(:school_role_template, school: school)
    create(:role_template_permission,
           school: school, role_template: custom_template, permission_key: "manage_academic", scope_kind: "full")
    create(:staff_profile, membership: membership, school: school, role_template: custom_template)
    membership
  end

  describe "teacher-role membership narrowed to assigned students" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    before do
      assign_teacher!(membership)
      set_current!(membership)
    end

    it "permits list and create" do
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
    end

    it "permits read for an assigned student and denies for an unassigned one" do
      expect(policy.show?).to be(true)
      expect(policy.assignable_student?(student)).to be(true)

      other_record = build(:incident, school: school, student: other_student, incident_type: incident_type)
      expect(described_class.new(user, other_record).show?).to be(false)
      expect(policy.assignable_student?(other_student)).to be(false)
    end

    it "denies approve and publish for the record's own author" do
      expect(policy.approve?).to be(false)
      expect(policy.publish?).to be(false)
    end

    it "scopes the index to assigned students only" do
      assigned = create(:incident, school: school, student: student, incident_type: incident_type,
                                    reported_by_membership: membership)
      create(:incident, school: school, student: other_student, incident_type: incident_type,
                         reported_by_membership: membership)

      resolved = described_class::Scope.new(user, Incident.all).resolve

      expect(resolved).to contain_exactly(assigned)
    end
  end

  describe "manage_academic staff whose role template is director-templated" do
    let(:user) { create(:user, email: "admin@example.com") }
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }

    before { set_current!(membership) }

    it "administers every same-school incident regardless of assignment" do
      other_record = build(:incident, school: school, student: other_student, incident_type: incident_type)

      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
      expect(described_class.new(user, other_record).show?).to be(true)
      expect(policy.assignable_student?(other_student)).to be(true)
    end

    it "permits approve (director role template) and publish" do
      expect(policy.approve?).to be(true)
      expect(policy.publish?).to be(true)
    end

    it "returns every same-school incident in scope" do
      a = create(:incident, school: school, student: student, incident_type: incident_type)
      b = create(:incident, school: school, student: other_student, incident_type: incident_type)

      resolved = described_class::Scope.new(user, Incident.all).resolve

      expect(resolved).to contain_exactly(a, b)
    end
  end

  describe "coordination-templated membership" do
    let(:user) { create(:user, email: "coord@example.com") }
    let!(:membership) { create(:membership, :coordination, user: user, school: school) }

    before { set_current!(membership) }

    it "permits approve" do
      expect(policy.approve?).to be(true)
    end
  end

  describe "manage_academic staff without a coordination/director role template (AC-IN05)" do
    let(:user) { create(:user) }
    let!(:membership) { create_manage_academic_only_membership!(user: user) }

    before { set_current!(membership) }

    it "may create and publish school-wide" do
      expect(policy.create?).to be(true)
      expect(policy.publish?).to be(true)
    end

    it "is denied approve even though it holds manage_academic" do
      expect(policy.approve?).to be(false)
    end
  end

  describe "guardian without any staff relationship" do
    let(:guardian) { create(:guardian, school: school) }
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    before do
      create(:student_guardian, school: school, student: student, guardian: guardian)
      set_current!(membership)
      Current.guardian = guardian
    end

    it "is denied create and approve and publish" do
      expect(policy.create?).to be(false)
      expect(policy.approve?).to be(false)
      expect(policy.publish?).to be(false)
    end

    it "permits index" do
      expect(policy.index?).to be(true)
    end

    context "a published, guardian-visible incident for their own child" do
      let(:record) do
        create(:incident, :published, school: school, student: student, incident_type: incident_type)
      end

      it "permits show" do
        expect(policy.show?).to be(true)
      end
    end

    context "an unpublished incident for their own child" do
      let(:record) do
        create(:incident, :pending_publish, school: school, student: student, incident_type: incident_type)
      end

      it "denies show" do
        expect(policy.show?).to be(false)
      end
    end

    context "a staff_only incident for their own child, even if published" do
      let(:record) do
        build(:incident, school: school, student: student, incident_type: incident_type,
                          visibility: "staff_only", published_at: Time.current)
      end

      it "denies show" do
        expect(policy.show?).to be(false)
      end
    end

    context "a published incident for another family's child" do
      let(:record) do
        create(:incident, :published, school: school, student: other_student, incident_type: incident_type)
      end

      it "denies show (cross-family)" do
        expect(policy.show?).to be(false)
      end
    end

    describe "Scope#resolve" do
      it "returns only published, guardian-visible incidents for their own linked student" do
        visible = create(:incident, :published, school: school, student: student, incident_type: incident_type)
        create(:incident, :pending_publish, school: school, student: student, incident_type: incident_type)
        create(:incident, :published, school: school, student: other_student, incident_type: incident_type)

        resolved = described_class::Scope.new(user, Incident.all).resolve

        expect(resolved).to contain_exactly(visible)
      end
    end
  end

  describe "an unrelated staff membership with neither manage_academic nor teacher role" do
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, :staff, user: user, school: school) }

    before { set_current!(membership) }

    it "is denied create and index" do
      expect(policy.create?).to be(false)
      expect(policy.index?).to be(false)
    end

    it "is denied approve and publish" do
      expect(policy.approve?).to be(false)
      expect(policy.publish?).to be(false)
    end

    describe "Scope#resolve" do
      it "returns none" do
        create(:incident, school: school, student: student, incident_type: incident_type)

        resolved = described_class::Scope.new(user, Incident.all).resolve

        expect(resolved).to be_empty
      end
    end
  end

  describe "staff with manage_academic but no matching teacher record" do
    let(:user) { create(:user, email: "coord@example.com") }
    let!(:membership) { create(:membership, :coordination, user: user, school: school) }

    before { set_current!(membership) }

    it "may list and assign any student without needing a teacher record" do
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
      expect(policy.assignable_student?(student)).to be(true)
    end
  end
end
