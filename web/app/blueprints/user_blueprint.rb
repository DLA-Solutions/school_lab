# frozen_string_literal: true

class UserBlueprint < Blueprinter::Base
  identifier :id

  fields :email, :status

  view :list do
    field :memberships do |user, _options|
      visible_memberships(user).includes(:school).map do |membership|
        {
          role: membership.role,
          school_name: membership.school&.name
        }
      end
    end
  end

  association :memberships, blueprint: MembershipBlueprint do |user, _options|
    visible_memberships(user).includes(
      { school: :school_modules },
      staff_profile: { role_template: :role_template_permissions },
      membership_permissions: []
    )
  end

  def self.visible_memberships(user)
    user.memberships.kept
       .left_joins(:school)
       .where("memberships.school_id IS NULL OR schools.discarded_at IS NULL")
  end
  private_class_method :visible_memberships

  field :guardian_profiles do |user, _options|
    GuardianBlueprint.render_as_hash(user.guardians.kept)
  end

  field :impersonation do |_user, _options|
    session = Current.impersonation_session
    next { active: false } unless session&.active?

    {
      active: true,
      operator_email: Current.impersonation_operator&.email,
      school_name: session.school.name,
      session_id: session.id,
      expires_at: session.expires_at.iso8601
    }
  end
end
