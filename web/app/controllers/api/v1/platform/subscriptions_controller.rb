# frozen_string_literal: true

module Api
  module V1
    module Platform
      class SubscriptionsController < Api::V1::BaseController
        rescue_from Pundit::NotAuthorizedError, with: :render_platform_forbidden

        def index
          authorize PlatformSubscription

          result = ::Platform::ListSubscriptionsService.call(filters: subscription_filters)
          return render_service_result(result) unless result.success?

          pagy, records = pagy(result.data)
          render json: {
            data: PlatformSubscriptionBlueprint.render_as_hash(records),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def show
          authorize PlatformSubscription
          subscription = PlatformSubscription.kept.find(params[:id])
          authorize subscription

          render json: {
            data: PlatformSubscriptionBlueprint.render_as_hash(subscription)
          }
        end

        def create
          authorize PlatformSubscription

          result = ::Platform::CreateSubscriptionService.call(params: subscription_params)
          render_service_result(result, success_status: :created) do |subscription|
            render json: {
              data: PlatformSubscriptionBlueprint.render_as_hash(subscription)
            }, status: :created
          end
        end

        def update
          authorize PlatformSubscription
          subscription = PlatformSubscription.kept.find(params[:id])
          authorize subscription

          result = ::Platform::UpdateSubscriptionService.call(
            subscription: subscription,
            params: subscription_params
          )
          render_service_result(result) do |updated_subscription|
            render json: {
              data: PlatformSubscriptionBlueprint.render_as_hash(updated_subscription)
            }
          end
        end

        private

        def subscription_filters
          {
            status: params[:status],
            school_id: params[:school_id]
          }
        end

        def subscription_params
          params.require(:subscription).permit(
            :school_id,
            :platform_plan_id,
            :status,
            :trial_ends_at,
            :current_period_end
          )
        end

        def render_platform_forbidden
          code = Current.user&.backoffice? ? :forbidden : :backoffice_only
          render_error(code, status: :forbidden)
        end
      end
    end
  end
end
