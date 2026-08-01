# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class PlansController < BaseController
          def index
            authorize BillingPlan

            plans = policy_scope(BillingPlan).order(:name)
            pagy, records = pagy(plans)

            render json: {
              data: BillingPlanBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            plan = policy_scope(BillingPlan).find(params[:id])
            authorize plan

            render json: { data: BillingPlanBlueprint.render_as_hash(plan) }
          end

          def create
            authorize BillingPlan

            plan = Current.school.billing_plans.build(plan_params)
            if plan.save
              render json: { data: BillingPlanBlueprint.render_as_hash(plan) }, status: :created
            else
              render_error(:validation_error, status: :unprocessable_content,
                                               details: plan.errors.to_hash)
            end
          end

          def update
            plan = policy_scope(BillingPlan).find(params[:id])
            authorize plan

            if plan.update(plan_params)
              render json: { data: BillingPlanBlueprint.render_as_hash(plan) }
            else
              render_error(:validation_error, status: :unprocessable_content,
                                               details: plan.errors.to_hash)
            end
          end

          def destroy
            plan = policy_scope(BillingPlan).find(params[:id])
            authorize plan

            plan.discard
            head :no_content
          end

          private

          def plan_params
            params.require(:billing_plan).permit(:name, :plan_type, :base_amount_cents)
          end
        end
      end
    end
  end
end
