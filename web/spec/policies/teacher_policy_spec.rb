# frozen_string_literal: true

require "rails_helper"

# LUI-6: `#dossier?` gates the collaborator-dossier export. Deliberately its own predicate (not a
# reuse of `#index?`) even though both check the same `manage_people` permission today -- the two
# actions are semantically different (export vs list).
#
# Scoped to `#dossier?` only: the rest of TeacherPolicy (`#index?`, `#show?`, `#create?`,
# `#update?`, `#destroy?`, `Scope`) has no existing spec coverage, and backfilling it is out of
# scope for this change.
RSpec.describe TeacherPolicy do
  let(:school) { create(:school) }

  after { Current.reset }

  def set_current!(membership, school:)
    Current.user = membership.user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
  end

  describe "#dossier?" do
    it "permits a director (manage_people: full)" do
      _user, membership = create_owner_membership(school)
      set_current!(membership, school: school)

      expect(described_class.new(membership.user, Teacher).dossier?).to be(true)
    end

    it "permits a secretary (manage_people: full)" do
      user = create(:user)
      membership = create(:membership, :staff, user: user, school: school)
      secretary_template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
      set_current!(membership, school: school)

      expect(described_class.new(user, Teacher).dossier?).to be(true)
    end

    it "denies a plain teacher (no manage_people)" do
      user = create(:user)
      membership = create(:membership, user: user, school: school, role: "teacher")
      teacher_template = create_system_templates_for(school).find { |t| t.system_key == "teacher" }
      create(:staff_profile, membership: membership, school: school, role_template: teacher_template)
      set_current!(membership, school: school)

      expect(described_class.new(user, Teacher).dossier?).to be(false)
    end

    it "denies a guardian" do
      user = create(:user)
      membership = create(:membership, user: user, school: school, role: "guardian")
      set_current!(membership, school: school)

      expect(described_class.new(user, Teacher).dossier?).to be(false)
    end

    it "denies a suspended staff membership" do
      user = create(:user)
      membership = create(:membership, :staff, :suspended, user: user, school: school)
      set_current!(membership, school: school)

      expect(described_class.new(user, Teacher).dossier?).to be(false)
    end
  end
end
