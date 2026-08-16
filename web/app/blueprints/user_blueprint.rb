# frozen_string_literal: true

class UserBlueprint < Blueprinter::Base
  identifier :id

  fields :email, :status

  view :list do
    field :memberships do |user, _options|
      user.memberships.kept.includes(:school).map do |membership|
        {
          role: membership.role,
          school_name: membership.school&.name
        }
      end
    end
  end

  association :memberships, blueprint: MembershipBlueprint do |user, _options|
    user.memberships.kept.includes(
      { school: :school_modules },
      staff_profile: { role_template: :role_template_permissions },
      membership_permissions: []
    )
  end

  field :guardian_profiles do |user, _options|
    GuardianBlueprint.render_as_hash(user.guardians.kept)
  end
end
