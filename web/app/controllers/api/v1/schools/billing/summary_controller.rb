# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class SummaryController < BaseController
          def show
            authorize :billing_summary, :show?, policy_class: BillingSummaryPolicy

            result = ::Billing::SummaryService.call(school: Current.school)
            render json: { data: BillingSummaryBlueprint.render_as_hash(result.data) }
          end
        end
      end
    end
  end
end
