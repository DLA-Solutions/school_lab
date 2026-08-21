# frozen_string_literal: true

# Who may read and replace a school's e-signature credentials.
#
# The platform's operators, and the school's own owner for their own school. The token creates
# documents in the school's name, so it does not fall to staff at large the way a permission key
# would — it is the owner's to hold, the same person who signs for the school.
#
# The scope is what keeps the second group to their own school; nothing here lets one school read
# another's. The token itself is never returned by the API to anyone.
class SchoolSignatureProviderPolicy < ApplicationPolicy
  def index?
    backoffice? || school_owner?
  end

  def create?
    index?
  end

  class Scope < Scope
    def resolve
      school_id = Current.school&.id
      return scope.none unless school_id
      return scope.none unless user&.backoffice? || owner?

      scope.where(school_id: school_id).order(created_at: :desc)
    end

    private

    # `ApplicationPolicy#school_owner?` lives on the policy rather than on the scope, so the same
    # question is asked here in the same terms.
    def owner?
      profile = Current.membership&.staff_profile
      profile&.kept? == true && profile.is_owner?
    end
  end
end
