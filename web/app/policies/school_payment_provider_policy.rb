# frozen_string_literal: true

class SchoolPaymentProviderPolicy < ApplicationPolicy
  def index?
    backoffice?
  end

  def create?
    backoffice?
  end

  class Scope < Scope
    def resolve
      return scope.none unless user&.backoffice?

      school_id = Current.school&.id
      return scope.none unless school_id

      scope.where(school_id: school_id).order(:instrument, created_at: :desc)
    end
  end
end
