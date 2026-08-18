# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class FiscalCredentialsController < BaseController
          def index
            authorize SchoolPaymentProvider

            configs = policy_scope(SchoolPaymentProvider).where(
              instrument: Gateways::ServiceInvoice::Registry::INSTRUMENT
            )
            render json: { data: SchoolPaymentProviderBlueprint.render_as_hash(configs) }
          end

          def create
            authorize SchoolPaymentProvider

            result = Backoffice::ProvisionSpedyCompanyService.call(
              school: Current.school,
              actor: Current.user
            )
            render_service_result(result, success_status: :created) do |record|
              render json: { data: SchoolPaymentProviderBlueprint.render_as_hash(record) }, status: :created
            end
          end

          def certificate
            authorize SchoolPaymentProvider, :create?

            result = Backoffice::UploadFiscalCertificateService.call(
              school: Current.school,
              actor: Current.user,
              certificate_io: params[:certificate],
              password: params[:password]
            )
            render_service_result(result) do |record|
              render json: { data: SchoolPaymentProviderBlueprint.render_as_hash(record) }
            end
          end
        end
      end
    end
  end
end
