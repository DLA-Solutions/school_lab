# frozen_string_literal: true

# Livro Ata books (BR-LA01): reserved for the three leadership role templates — director,
# coordination and secretary — read from the membership's role template, never from params. Every
# other role, including teachers and guardians, is denied by default (BR-LA09).
class MinutesBookPolicy < ApplicationPolicy
  ROLE_TEMPLATE_KEYS = %w[director coordination secretary].freeze

  def index? = minutes_staff?
  def show? = same_school? && minutes_staff?
  def create? = minutes_staff?
  def update? = show?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school && MinutesBookPolicy.minutes_staff?

      scope.kept.where(school_id: Current.school.id)
    end
  end

  # Shared with the entry policy and both scopes.
  def self.minutes_staff?
    membership = Current.membership
    return false unless membership&.active? && membership.staff_member?

    profile = membership.staff_profile
    return false unless profile&.kept?

    ROLE_TEMPLATE_KEYS.include?(profile.role_template&.system_key)
  end

  private

  def minutes_staff?
    self.class.minutes_staff?
  end

  def same_school?
    record.school_id == school_id
  end
end
