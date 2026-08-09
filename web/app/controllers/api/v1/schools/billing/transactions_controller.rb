# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        # The school's own ledger: what came in and what went out, for the movements a boleto
        # does not explain — textbooks sold at the counter, the payroll, a grant.
        class TransactionsController < BaseController
          def index
            authorize SchoolTransaction

            scope = apply_filters(policy_scope(SchoolTransaction).ordered)
            pagy, records = pagy(scope)

            render json: {
              data: SchoolTransactionBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def create
            authorize SchoolTransaction

            transaction = Current.school.school_transactions.build(transaction_params)
            save_and_render(transaction, status: :created)
          end

          def update
            transaction = policy_scope(SchoolTransaction).find(params[:id])
            authorize transaction

            transaction.assign_attributes(transaction_params)
            save_and_render(transaction)
          end

          def destroy
            transaction = policy_scope(SchoolTransaction).find(params[:id])
            authorize transaction

            transaction.discard
            head :no_content
          end

          private

          def save_and_render(transaction, status: :ok)
            if transaction.save
              render json: { data: SchoolTransactionBlueprint.render_as_hash(transaction) }, status: status
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: transaction.errors.to_hash)
            end
          end

          def apply_filters(scope)
            scope = scope.where(kind: params[:kind]) if params[:kind].present?
            scope = scope.where(category: params[:category]) if params[:category].present?
            scope = scope.where(occurred_on: Date.parse(params[:from])..) if params[:from].present?
            scope = scope.where(occurred_on: ..Date.parse(params[:to])) if params[:to].present?
            scope
          rescue ArgumentError
            scope
          end

          def transaction_params
            params.require(:school_transaction)
                  .permit(:kind, :category, :description, :amount_cents, :occurred_on)
          end
        end
      end
    end
  end
end
