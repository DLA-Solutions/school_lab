# frozen_string_literal: true

module Api
  module V1
    class SchoolsController < BaseController
      BACKOFFICE_SHOW_INCLUDES = %w[modules active_school_year aggregate_counts].freeze

      def index
        authorize School

        schools = apply_index_filters(policy_scope(index_scope).order(:name))
        return if performed?

        pagy, records = pagy(schools)

        render json: {
          data: SchoolBlueprint.render_as_hash(records),
          meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
        }
      end

      def show
        school = policy_scope(School.kept).find(params[:id])
        authorize school

        render json: { data: render_school(school) }
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

      def restore
        school = policy_scope(School.with_discarded).find(params[:id])
        authorize school, :restore?

        result = ::Schools::RestoreSchoolService.call(school: school, actor: Current.user)
        render_service_result(result) do |restored_school|
          render json: { data: SchoolBlueprint.render_as_hash(restored_school) }
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
          :name, :cnpj, :address, :school_group_id, :onboarding_mode,
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

      def index_scope
        discarded_list? ? School.discarded : School.kept
      end

      def discarded_list?
        ActiveModel::Type::Boolean.new.cast(params[:discarded])
      end

      def apply_index_filters(scope)
        scope = filter_onboarding(scope)
        scope = filter_search(scope)
        scope = filter_saas_plan(scope)
        scope = filter_created_dates(scope)
        scope
      end

      def filter_onboarding(scope)
        status = params[:onboarding_status].to_s.presence
        mode = params[:onboarding_mode].to_s.presence

        scope = scope.where(onboarding_status: status) if status.in?(School::ONBOARDING_STATUSES)
        scope = scope.where(onboarding_mode: mode) if mode.in?(School::ONBOARDING_MODES)

        scope
      end

      def filter_search(scope)
        term = params[:q].to_s.strip
        return scope if term.blank?

        sanitized = School.sanitize_sql_like(term)
        scope.where("schools.name ILIKE :term OR schools.cnpj ILIKE :term", term: "%#{sanitized}%")
      end

      def filter_saas_plan(scope)
        key = params[:saas_plan].to_s.presence
        return scope if key.blank?

        scope.joins(:platform_subscription)
             .joins("INNER JOIN platform_plans ON platform_plans.id = platform_subscriptions.platform_plan_id")
             .where(platform_subscriptions: { discarded_at: nil }, platform_plans: { key: key })
      end

      def filter_created_dates(scope)
        created_after = parse_created_date_param(params[:created_after], :created_after)
        return scope if performed?

        created_before = parse_created_date_param(params[:created_before], :created_before)
        return scope if performed?

        scope = scope.where(created_at: created_after.beginning_of_day..) if created_after
        scope = scope.where(created_at: ..created_before.end_of_day) if created_before
        scope
      end

      def parse_created_date_param(value, param_name)
        return nil if value.blank?

        Date.iso8601(value.to_s)
      rescue Date::Error
        render_error(
          :validation_error,
          status: :unprocessable_content,
          details: { param_name => [ "must be a valid ISO date (YYYY-MM-DD)" ] }
        )
        nil
      end

      def render_school(school)
        includes = backoffice_show_includes
        if includes.any?
          SchoolBlueprint.render_as_hash(school, view: :backoffice_detail, include: includes)
        else
          SchoolBlueprint.render_as_hash(school)
        end
      end

      def backoffice_show_includes
        return [] unless Current.user&.backoffice?

        params[:include].to_s.split(",").map(&:strip).compact_blank & BACKOFFICE_SHOW_INCLUDES
      end
    end
  end
end
