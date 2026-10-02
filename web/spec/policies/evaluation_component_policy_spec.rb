# frozen_string_literal: true

require "rails_helper"

RSpec.describe EvaluationComponentPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:record) { create(:evaluation_component, school: school) }
  let(:user) { create(:user) }

  after { Current.reset }

  describe "secretary with manage_enrollment" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits reading the grade book grid" do
      expect(policy.index?).to be(true)
    end
  end

  describe "a stock teacher (holds only `teach`, never `manage_enrollment`)" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }
    let(:teacher_template) { create_system_templates_for(school).find { |t| t.system_key == "teacher" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: teacher_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    # `teach` and `manage_enrollment` are separate permission keys, and the system `teacher`
    # template only grants `teach` (see `lib/school_lab/permissions.rb`). A teacher reading their
    # own grade book is the entire point of this endpoint, so `teach` alone must be enough here —
    # the per-class narrowing (did THIS teacher teach THIS class/discipline) is the controller's
    # job via `ClassDiscipline#teacher_id`, not this policy's.
    it "permits reading the grade book grid on `teach` alone" do
      expect(policy.index?).to be(true)
    end
  end

  describe "a staff role with neither `teach` nor `manage_enrollment`" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:billing_only_template) { create(:school_role_template, school: school) }

    before do
      create(:role_template_permission, school: school, role_template: billing_only_template,
                                        permission_key: "manage_billing", scope_kind: "full")
      create(:staff_profile, membership: membership, school: school, role_template: billing_only_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies reading the grade book grid" do
      expect(policy.index?).to be(false)
    end
  end

  describe "Scope" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }
    let!(:own_component) { create(:evaluation_component, school: school) }
    let!(:other_school_component) { create(:evaluation_component, school: create(:school)) }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "resolves only components in the current school" do
      resolved = EvaluationComponentPolicy::Scope.new(user, EvaluationComponent).resolve

      expect(resolved).to include(own_component)
      expect(resolved).not_to include(other_school_component)
    end

    it "resolves to none without a current school" do
      Current.school = nil

      resolved = EvaluationComponentPolicy::Scope.new(user, EvaluationComponent).resolve

      expect(resolved).to be_empty
    end
  end
end
