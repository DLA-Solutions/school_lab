# frozen_string_literal: true

module People
  class CreateMembershipService < ApplicationService
    STAFF_WITH_TEMPLATE_ROLES = %w[staff teacher].freeze
    NO_TEMPLATE_ROLES = %w[guardian backoffice].freeze

    def initialize(school:, params:, inviter: nil)
      @school = school
      @params = params
      @inviter = inviter
    end

    def call
      email = params[:email].to_s.strip.downcase
      return ResponseService.failure(code: :validation_error, details: { email: [ "can't be blank" ] }) if email.blank?

      role = params[:role].to_s
      if role == "school"
        return ResponseService.failure(
          code: :validation_error,
          details: { role: [ "is not assignable via invite" ] }
        )
      end

      user = find_or_create_user(email)
      return user if user.is_a?(ResponseService)

      if STAFF_WITH_TEMPLATE_ROLES.include?(role)
        create_staff_membership(user:, role:)
      elsif NO_TEMPLATE_ROLES.include?(role)
        create_simple_membership(user:, role:)
      else
        ResponseService.failure(code: :validation_error, details: { role: [ "is invalid" ] })
      end
    end

    private

    attr_reader :school, :params, :inviter

    def create_simple_membership(user:, role:)
      membership = school.memberships.build(user: user, role: role, status: "invited")

      if membership.save
        issue_invite(membership)
      else
        ResponseService.failure(code: :validation_error, details: membership.errors.to_hash)
      end
    end

    def create_staff_membership(user:, role:)
      role_template_id = params[:role_template_id]
      if role_template_id.blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { role_template_id: [ "can't be blank" ] }
        )
      end

      template = school.school_role_templates.kept.find_by(id: role_template_id)
      return ResponseService.failure(code: :not_found) if template.blank?

      role_template_error = validate_role_template_assignment(role:, template:)
      return role_template_error if role_template_error

      segment_error = validate_segment
      return segment_error if segment_error

      membership = nil

      ActiveRecord::Base.transaction do
        membership = school.memberships.create!(user: user, role: role, status: "invited")
        school.staff_profiles.create!(
          membership: membership,
          role_template: template,
          segment_id: params[:segment_id],
          display_title: params[:display_title],
          is_owner: false,
          also_teaches: template.system_key == "coordination"
        )
      end

      issue_invite(reload_membership(membership))
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    def validate_role_template_assignment(role:, template:)
      if template.system_key == "teacher" && role != "teacher"
        return ResponseService.failure(
          code: :validation_error,
          details: { role_template_id: [ "requires role teacher" ] }
        )
      end

      if role == "teacher" && template.system_key != "teacher"
        return ResponseService.failure(
          code: :validation_error,
          details: { role: [ "requires teacher role template" ] }
        )
      end

      if role == "staff" && template.system_key == "teacher"
        return ResponseService.failure(
          code: :validation_error,
          details: { role_template_id: [ "cannot be assigned to staff role" ] }
        )
      end

      nil
    end

    def validate_segment
      segment_id = params[:segment_id]
      return nil if segment_id.blank?

      segment = school.segments.kept.find_by(id: segment_id)
      return nil if segment.present?

      ResponseService.failure(
        code: :validation_error,
        details: { segment_id: [ "is invalid" ] }
      )
    end

    def reload_membership(membership)
      school.memberships
            .includes(staff_profile: { role_template: :role_template_permissions })
            .find(membership.id)
    end

    def issue_invite(membership)
      token_result = Identity::IssueMembershipInviteTokenService.call(membership: membership, inviter: inviter)
      return token_result if token_result.failure?

      enqueue_invite(membership, token_result.data[:raw_token])
      ResponseService.success(data: membership)
    end

    def enqueue_invite(membership, raw_token)
      People::InviteMembershipNotificationJob.perform_later(membership.id, raw_token)
    end

    def find_or_create_user(email)
      existing = User.kept.find_by("LOWER(email) = ?", email)
      return existing if existing

      user = User.new(email: email)
      user.skip_confirmation!

      if user.save(validate: false)
        user
      else
        ResponseService.failure(code: :validation_error, details: user.errors.to_hash)
      end
    end
  end
end
