# frozen_string_literal: true

module Schools
  class CreateSchoolService < ApplicationService
    ONBOARDING_MODES = School::ONBOARDING_MODES

    def initialize(params:, actor: nil, owner_email: nil)
      @params = params.to_h.symbolize_keys
      @actor = actor
      @owner_email = owner_email.to_s.strip.downcase.presence
    end

    def call
      return missing_owner_email_failure if backoffice_create? && owner_email.blank?

      school = build_school
      provision_result = nil
      owner_result = nil

      ActiveRecord::Base.transaction do
        unless school.save
          return ResponseService.failure(code: :validation_error, details: school.errors.to_hash)
        end

        provision_result = Identity::ProvisionSystemRoleTemplatesService.call(school: school)
        unless provision_result.success?
          raise ActiveRecord::Rollback
        end

        if owner_email.present?
          owner_result = create_owner_membership!(school)
          raise ActiveRecord::Rollback unless owner_result.success?
        else
          grant_founding_membership!(school)
        end
      end

      return ResponseService.failure(code: :validation_error, details: school.errors.to_hash) unless school.persisted?
      return provision_result if provision_result&.failure?
      return owner_result if owner_result&.failure?

      school.reload
      Onboarding::EventEmitter.school_provisioned(school: school) if owner_email.present?
      ResponseService.success(data: school)
    end

    private

    attr_reader :params, :actor, :owner_email

    def backoffice_create?
      actor.present? && actor.backoffice?
    end

    def build_school
      attributes = params.except(:onboarding_mode)
      school = School.new(attributes)

      if owner_email.present?
        school.onboarding_mode = resolved_onboarding_mode
        school.onboarding_status = onboarding_status_for(school.onboarding_mode)
      else
        school.onboarding_mode = params[:onboarding_mode].presence || "self_serve"
        school.onboarding_status = "active"
      end

      school
    end

    def resolved_onboarding_mode
      mode = params[:onboarding_mode].to_s.presence
      return mode if mode.in?(ONBOARDING_MODES)

      "self_serve"
    end

    def onboarding_status_for(mode)
      mode == "white_glove" ? "provisioning" : "pending_handoff"
    end

    def create_owner_membership!(school)
      user = find_or_create_user(owner_email)
      return user if user.is_a?(ResponseService)

      director = school.system_role_template("director")
      if director.blank?
        return ResponseService.failure(code: :not_found, details: { role_template: [ "director template missing" ] })
      end

      membership = school.memberships.create!(user: user, role: "staff", status: "invited")
      school.staff_profiles.create!(
        membership: membership,
        role_template: director,
        is_owner: true,
        display_title: "Diretor"
      )

      token_result = Identity::IssueMembershipInviteTokenService.call(membership: membership, inviter: actor)
      return token_result if token_result.failure?

      People::InviteMembershipNotificationJob.perform_later(membership.id, token_result.data[:raw_token])
      ResponseService.success(data: membership)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
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

    def grant_founding_membership!(school)
      return if actor.blank? || actor.backoffice?

      membership = Membership.create!(user: actor, school: school, role: "staff", status: "active")
      director = school.system_role_template("director")
      StaffProfile.create!(
        membership: membership,
        school: school,
        role_template: director,
        is_owner: true,
        display_title: "Diretor"
      )
    end

    def missing_owner_email_failure
      ResponseService.failure(
        code: :validation_error,
        details: { owner_email: [ "can't be blank" ] }
      )
    end
  end
end
