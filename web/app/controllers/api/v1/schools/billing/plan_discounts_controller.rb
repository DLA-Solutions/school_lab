# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class PlanDiscountsController < BaseController
          def index
            authorize PlanDiscount

            pagy, records = pagy(policy_scope(PlanDiscount).ordered)

            render json: {
              data: PlanDiscountBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def create
            authorize PlanDiscount

            discount = Current.school.plan_discounts.build(discount_params)
            save_and_render(discount, status: :created)
          end

          def update
            discount = policy_scope(PlanDiscount).find(params[:id])
            authorize discount

            discount.assign_attributes(discount_params)
            save_and_render(discount)
          end

          def destroy
            discount = policy_scope(PlanDiscount).find(params[:id])
            authorize discount

            # Contracts keep pointing at the band they were granted; removing it would erase the
            # explanation for an amount already agreed with a family.
            if discount.contracts.kept.exists?
              return render_error(
                :validation_error,
                status: :unprocessable_content,
                details: { base: [ I18n.t("api.errors.plan_discount_in_use",
                                         count: discount.contracts.kept.count) ] }
              )
            end

            discount.discard
            head :no_content
          end

          # Creates whatever of the standard bands the school is missing.
          def provision_defaults
            authorize PlanDiscount, :provision_defaults?

            discounts = PlanDiscount.provision_defaults!(Current.school)

            render json: { data: PlanDiscountBlueprint.render_as_hash(discounts) }, status: :created
          end

          private

          def save_and_render(discount, status: :ok)
            if discount.save
              render json: { data: PlanDiscountBlueprint.render_as_hash(discount) }, status: status
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: discount.errors.to_hash)
            end
          end

          def discount_params
            params.require(:plan_discount).permit(:name, :percent)
          end
        end
      end
    end
  end
end
