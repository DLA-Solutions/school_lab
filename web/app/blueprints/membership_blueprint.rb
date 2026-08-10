# frozen_string_literal: true

class MembershipBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :role, :status

  field :email do |membership|
    membership.user&.email
  end

  field :school_name do |membership|
    membership.school&.name
  end

  field :role_template do |membership|
    staff_profile = membership.staff_profile
    next nil unless staff_profile&.kept?

    SchoolRoleTemplateBlueprint.render_as_hash(staff_profile.role_template)
  end

  field :is_owner do |membership|
    staff_profile = membership.staff_profile
    staff_profile&.kept? ? staff_profile.is_owner : nil
  end

  field :segment_id do |membership|
    staff_profile = membership.staff_profile
    staff_profile&.kept? ? staff_profile.segment_id : nil
  end

  field :display_title do |membership|
    staff_profile = membership.staff_profile
    staff_profile&.kept? ? staff_profile.display_title : nil
  end

  field :permissions do |membership, options|
    MembershipBlueprint.send(:effective_resolution, membership, options)[:keys]
  end

  field :permission_sources do |membership, options|
    MembershipBlueprint.send(:effective_resolution, membership, options)[:sources]
  end

  class << self
    private

    def effective_resolution(membership, options)
      return { keys: [], sources: {} } unless membership.active? || membership.invited?

      cache = (options[:permission_resolutions] ||= {})
      cache[membership.id] ||= begin
        result = Identity::ResolveEffectivePermissionsService.call(membership: membership)
        result.success? ? result.data : { keys: [], sources: {} }
      end
    end
  end
end
