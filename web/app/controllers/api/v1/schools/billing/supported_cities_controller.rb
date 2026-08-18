# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class SupportedCitiesController < BaseController
          def index
            authorize SchoolFiscalSetting, :show?

            result = ::Billing::SearchSupportedCitiesService.call(
              school: Current.school,
              query: params[:query],
              state: params[:state],
              code: params[:code]
            )
            render_service_result(result) do |cities|
              render json: { data: SupportedCityBlueprint.render_as_hash(cities) }
            end
          end
        end
      end
    end
  end
end
