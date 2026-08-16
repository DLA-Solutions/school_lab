# frozen_string_literal: true

# Who may read and replace a school's bank credentials.
#
# These are the mTLS certificate and private key that issue boletos in the school's name, so the
# reach is deliberately narrow: the platform's own operators, and the school's own billing staff
# for their own school. A school owner holds this certificate anyway — the bank issued it to them —
# and a certificate expires, so making them wait on the platform to replace it stops their billing.
#
# The scope is what keeps the second group to their own school; nothing here lets one school read
# another's. The bodies themselves are never returned by the API in either case.
class SchoolPaymentProviderPolicy < ApplicationPolicy
  def index?
    backoffice? || staff_with?(:manage_billing)
  end

  def create?
    index?
  end

  class Scope < Scope
    def resolve
      school_id = Current.school&.id
      return scope.none unless school_id
      return scope.none unless user&.backoffice? || staff_with?(:manage_billing)

      scope.where(school_id: school_id).order(:instrument, created_at: :desc)
    end
  end
end
