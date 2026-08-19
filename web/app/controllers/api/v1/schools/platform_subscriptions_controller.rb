# frozen_string_literal: true

module Api
  module V1
    module Schools
      class PlatformSubscriptionsController < BaseController
        before_action :set_school_context!

        def show
          authorize PlatformSubscription, :show_own?

          subscription = Current.school.platform_subscription
          render json: {
            data: subscription && PlatformSubscriptionBlueprint.render_as_hash(subscription, view: :school)
          }
        end

        def checkout
          authorize PlatformSubscription, :checkout_own?

          result = ::Platform::CreateCheckoutSessionService.call(
            school: Current.school,
            actor: Current.user,
            params: checkout_params.merge(school_scoped: true)
          )
          render_service_result(result, success_status: :created) do |payload|
            session = payload.fetch(:session)
            render json: {
              data: {
                checkout_url: session.checkout_url,
                billing_portal_url: session.billing_portal_url
              }
            }, status: :created
          end
        end

        def change_plan
          authorize PlatformSubscription, :change_plan_own?
          subscription = current_subscription!
          return unless subscription

          result = ::Platform::ChangeSubscriptionPlanService.call(
            subscription: subscription,
            params: change_plan_params
          )
          render_service_result(result) do |updated|
            render json: {
              data: PlatformSubscriptionBlueprint.render_as_hash(updated, view: :school)
            }
          end
        end

        def cancel
          authorize PlatformSubscription, :cancel_own?
          subscription = current_subscription!
          return unless subscription

          result = ::Platform::CancelSubscriptionService.call(
            subscription: subscription,
            at_period_end: cancel_params.fetch(:at_period_end, true)
          )
          render_service_result(result) do |updated|
            render json: {
              data: PlatformSubscriptionBlueprint.render_as_hash(updated, view: :school)
            }
          end
        end

        def invoices
          authorize PlatformSubscription, :invoices_own?

          invoices = policy_scope(PlatformInvoice).where(school_id: Current.school.id).order(created_at: :desc)
          pagy, records = pagy(invoices)
          render json: {
            data: PlatformInvoiceBlueprint.render_as_hash(records),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        private

        def current_subscription!
          subscription = Current.school.platform_subscription
          return subscription if subscription

          render_error(:not_found, status: :not_found)
          nil
        end

        def checkout_params
          params.permit(:plan_key, :billing_interval, :trial)
        end

        def change_plan_params
          params.permit(:plan_key, :billing_interval)
        end

        def cancel_params
          params.permit(:at_period_end)
        end
      end
    end
  end
end
