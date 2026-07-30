# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class PaymentsController < BaseController
          def index
            authorize Payment

            payments = policy_scope(Payment).includes(:charge).order(paid_at: :desc)
            pagy, records = pagy(payments)

            render json: {
              data: PaymentBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end
        end
      end
    end
  end
end
