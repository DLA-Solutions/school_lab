# frozen_string_literal: true

module Api
  module V1
    class SchoolsController < BaseController
      def index
        authorize School

        schools = filter_onboarding(policy_scope(School.kept).order(:name))
        pagy, records = pagy(schools)

        render json: {
          data: SchoolBlueprint.render_as_hash(records),
          meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
        }
      end

      def show
        school = policy_scope(School.kept).find(params[:id])
        authorize school

        render json: { data: SchoolBlueprint.render_as_hash(school) }
      end

      def create
        authorize School

        owner_email = params.dig(:school, :owner_email).to_s.strip.downcase.presence
        result = ::Schools::CreateSchoolService.call(
          params: school_params,
          actor: Current.user,
          owner_email: owner_email,
          modules: modules_params
        )
        render_service_result(result, success_status: :created) do |school|
          payload = { data: SchoolBlueprint.render_as_hash(school) }
          payload[:meta] = owner_invite_meta if owner_email.present?

          render json: payload, status: :created
        end
      end

      def update
        school = policy_scope(School.kept).find(params[:id])
        authorize school

        result = ::Schools::UpdateSchoolService.call(school: school, params: school_params)
        render_service_result(result) do |updated_school|
          render json: { data: SchoolBlueprint.render_as_hash(updated_school) }
        end
      end

      def destroy
        school = policy_scope(School.kept).find(params[:id])
        authorize school

        result = ::Schools::DiscardSchoolService.call(school: school, actor: Current.user)
        render_service_result(result, success_status: :no_content) do
          head :no_content
        end
      end

      def handoff
        school = policy_scope(School.kept).find(params[:id])
        set_handoff_context!(school)
        authorize school, :handoff?

        result = ::Schools::HandoffService.call(
          school: school,
          actor: Current.user,
          params: handoff_params
        )
        render_service_result(result) do |updated_school|
          render json: { data: SchoolBlueprint.render_as_hash(updated_school) }
        end
      end

      private

      def school_params
        params.require(:school).permit(
          :name, :cnpj, :address, :saas_plan, :school_group_id, :onboarding_mode,
          :signature_email
        )
      end

      def modules_params
        raw = params[:modules]
        return if raw.blank?

        raw.to_unsafe_h
      end

      def handoff_params
        params.fetch(:handoff, {}).permit(:billing_waived)
      end

      def owner_invite_meta
        {
          owner_invite_email_status: SchoolLab::EmailDelivery.configured? ? "queued" : "not_configured"
        }
      end

      def filter_onboarding(scope)
        status = params[:onboarding_status].to_s.presence
        mode = params[:onboarding_mode].to_s.presence

        scope = scope.where(onboarding_status: status) if status.in?(School::ONBOARDING_STATUSES)
        scope = scope.where(onboarding_mode: mode) if mode.in?(School::ONBOARDING_MODES)

        scope
      end
    end
  end
end
