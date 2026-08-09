# frozen_string_literal: true

class JobPositionPolicy < ApplicationPolicy
  def index? = school_staff?
  def show? = school_staff? && record.school_id == school_id
  def create? = school_staff?
  def update? = school_staff? && record.school_id == school_id
  def destroy? = update?
  def provision_defaults? = school_staff?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
