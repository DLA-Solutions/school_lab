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
            data: PlatformSubscriptionBlueprint.render_as_hash(records, view: :backoffice),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def show
          authorize PlatformSubscription
          subscription = PlatformSubscription.kept.find(params[:id])
          authorize subscription

          render json: {
            data: PlatformSubscriptionBlueprint.render_as_hash(subscription, view: :backoffice)
          }
        end

        def create
          authorize PlatformSubscription

          result = ::Platform::CreateSubscriptionService.call(params: subscription_params)
          render_service_result(result, success_status: :created) do |subscription|
            render json: {
              data: PlatformSubscriptionBlueprint.render_as_hash(subscription, view: :backoffice)
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
              data: PlatformSubscriptionBlueprint.render_as_hash(updated_subscription, view: :backoffice)
            }
          end
        end

        def checkout
          subscription = PlatformSubscription.kept.find(params[:id])
          authorize subscription, :checkout?

          result = ::Platform::CreateCheckoutSessionService.call(
            school: subscription.school,
            subscription: subscription,
            params: checkout_params.merge(platform_plan_id: subscription.platform_plan_id),
            allow_existing: true
          )
          render_service_result(result) do |payload|
            session = payload.fetch(:session)
            render json: {
              data: {
                checkout_url: session.checkout_url,
                billing_portal_url: session.billing_portal_url,
                subscription_id: payload.fetch(:subscription).id
              }
            }
          end
        end

        def invoices
          subscription = PlatformSubscription.kept.find(params[:id])
          authorize subscription, :invoices?

          invoices = policy_scope(subscription.platform_invoices).order(created_at: :desc)
          pagy, records = pagy(invoices)
          render json: {
            data: PlatformInvoiceBlueprint.render_as_hash(records, view: :backoffice),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def change_plan
          subscription = PlatformSubscription.kept.find(params[:id])
          authorize subscription, :change_plan?

          result = ::Platform::ChangeSubscriptionPlanService.call(
            subscription: subscription,
            params: change_plan_params
          )
          render_service_result(result) do |updated|
            render json: {
              data: PlatformSubscriptionBlueprint.render_as_hash(updated, view: :backoffice)
            }
          end
        end

        def cancel
          subscription = PlatformSubscription.kept.find(params[:id])
          authorize subscription, :cancel?

          result = ::Platform::CancelSubscriptionService.call(
            subscription: subscription,
            at_period_end: cancel_params.fetch(:at_period_end, true)
          )
          render_service_result(result) do |updated|
            render json: {
              data: PlatformSubscriptionBlueprint.render_as_hash(updated, view: :backoffice)
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
            :plan_key,
            :status,
            :trial_ends_at,
            :current_period_end,
            :billing_interval,
            :trial,
            :provider
          )
        end

        def checkout_params
          params.fetch(:checkout, params).permit(:trial, :plan_key, :billing_interval)
        end

        def change_plan_params
          params.permit(:plan_key, :billing_interval, :platform_plan_id)
        end

        def cancel_params
          params.permit(:at_period_end)
        end

        def render_platform_forbidden
          code = Current.user&.backoffice? ? :forbidden : :backoffice_only
          render_error(code, status: :forbidden)
        end
      end
    end
  end
end
