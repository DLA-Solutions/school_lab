# frozen_string_literal: true

require "rails_helper"

RSpec.describe MessagePolicy do
  subject(:policy) { described_class.new(user, Message) }

  let(:school) { create(:school) }
  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:user) { create(:user) }

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

  def destinations_for(actor)
    ConversationPolicy.new(actor, Conversation).destinations?
  end

  describe "create?" do
    it "permits a guardian, including one with no linked child, and only a guardian lists destinations" do
      guardian = create(:guardian, school: school, user: user)
      create(:student_guardian, school: school, student: create(:student, school: school, school_class: school_class),
                                 guardian: guardian)
      linked = create(:membership, user: user, school: school, role: "guardian")
      set_current!(linked)

      expect(policy.create?).to be(true)
      expect(destinations_for(user)).to be(true)

      unlinked_user = create(:user)
      unlinked = create(:membership, user: unlinked_user, school: school, role: "guardian")
      set_current!(unlinked)

      expect(described_class.new(unlinked_user, Message).create?).to be(true)
      expect(destinations_for(unlinked_user)).to be(true)
    end

    it "permits a secretary and does not list destinations" do
      membership = staff_membership!(user, "secretary")
      set_current!(membership)

      expect(policy.create?).to be(true)
      expect(destinations_for(user)).to be(false)
    end

    it "permits a teacher and does not list destinations" do
      teacher = create(:teacher, school: school, email: "ana.teacher@example.com")
      actor = create(:user, email: teacher.email)
      membership = create(:membership, user: actor, school: school, role: "teacher")
      templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
      create(:staff_profile, membership: membership, school: school, role_template: templates.fetch("teacher"))
      set_current!(membership)

      expect(described_class.new(actor, Message).create?).to be(true)
      expect(destinations_for(actor)).to be(false)
    end

    it "permits coordination and does not list destinations" do
      membership = staff_membership!(user, "coordination")
      set_current!(membership)

      expect(policy.create?).to be(true)
      expect(destinations_for(user)).to be(false)
    end

    it "permits a director and does not list destinations" do
      membership = staff_membership!(user, "director")
      set_current!(membership)

      expect(policy.create?).to be(true)
      expect(destinations_for(user)).to be(false)
    end

    it "denies a staff membership that is neither secretary, coordination, nor director" do
      membership = create(:membership, :staff, user: user, school: school)
      template = create(:school_role_template, school: school)
      create(:role_template_permission,
             school: school, role_template: template, permission_key: "moderate_messages", scope_kind: "full")
      create(:staff_profile, membership: membership, school: school, role_template: template)
      set_current!(membership)

      expect(policy.create?).to be(false)
      expect(destinations_for(user)).to be(false)
    end
  end

  describe "actions other than create" do
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    before { set_current!(membership) }

    it "denies index, show, update, and destroy" do
      expect(policy.index?).to be(false)
      expect(policy.show?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
    end
  end
end
