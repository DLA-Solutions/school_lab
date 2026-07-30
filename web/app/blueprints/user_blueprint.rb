# frozen_string_literal: true

class UserBlueprint < Blueprinter::Base
  identifier :id

  fields :email, :status

  association :memberships, blueprint: MembershipBlueprint do |user, _options|
    user.memberships.kept.includes(:school)
  end

  field :guardian_profiles do |user, _options|
    GuardianBlueprint.render_as_hash(user.guardians.kept)
  end
end
