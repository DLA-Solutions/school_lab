# frozen_string_literal: true

class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def index?
    false
  end

  def show?
    false
  end

  def create?
    false
  end

  def new?
    create?
  end

  def update?
    false
  end

  def edit?
    update?
  end

  def destroy?
    false
  end

  private

  def backoffice?
    user&.backoffice?
  end

  def school_owner?
    profile = Current.membership&.staff_profile
    profile&.kept? == true && profile.is_owner?
  end

  def platform_with?(permission_key)
    user&.platform_permission?(permission_key)
  end

  def provisioning_school
    school = provisioning_context_school
    school if school&.provisioning?
  end

  def provisioning_with?(permission_key)
    backoffice? && platform_with?(permission_key) && provisioning_school.present?
  end

  def staff_with?(permission_key)
    return true if provisioning_with?(:provision_school)

    membership = Current.membership
    return false unless membership&.active?
    return false unless membership.staff_member?

    keys = Current.effective_permission_keys
    if keys.nil?
      result = Identity::ResolveEffectivePermissionsService.call(membership: membership)
      keys = result.success? ? result.data.fetch(:keys) : []
      Current.effective_permission_keys = keys
    end

    keys.include?(permission_key.to_s)
  end

  def guardian_member?
    Current.membership&.role == "guardian" && Current.membership&.active? && Current.guardian.present?
  end

  def school_id
    Current.school&.id
  end

  def provisioning_context_school
    return record if record.is_a?(School)
    return record.school if record.respond_to?(:school) && record.school.is_a?(School)

    Current.school
  end

  class Scope
    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      raise NoMethodError, "You must define #resolve in #{self.class}"
    end

    def staff_with?(permission_key)
      membership = Current.membership
      return true if user&.platform_permission?(:provision_school) && Current.school&.provisioning?

      return false unless membership&.active? && membership.staff_member?

      keys = Current.effective_permission_keys
      if keys.nil?
        result = Identity::ResolveEffectivePermissionsService.call(membership: membership)
        keys = result.success? ? result.data.fetch(:keys) : []
        Current.effective_permission_keys = keys
      end

      keys.include?(permission_key.to_s)
    end

    private

    attr_reader :user, :scope
  end
end
