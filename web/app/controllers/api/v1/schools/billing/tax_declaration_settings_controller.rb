# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class TaxDeclarationSettingsController < BaseController
          def show
            settings = ::TaxDeclarationSetting.for(Current.school)
            authorize settings_record_for(settings)

            ::BillingPurpose.provision_defaults!(Current.school)

            render json: { data: TaxDeclarationSettingBlueprint.render_as_hash(settings) }
          end

          def update
            settings = ::TaxDeclarationSetting.for(Current.school)
            authorize settings_record_for(settings)

            result = ::Billing::UpdateTaxDeclarationSettingsService.call(
              school: Current.school,
              params: settings_params,
              actor: Current.user
            )

            render_service_result(result) do |updated|
              render json: { data: TaxDeclarationSettingBlueprint.render_as_hash(updated) }
            end
          end

          private

          def settings_record_for(settings)
            settings.persisted? ? settings : settings.tap { |record| record.school_id = Current.school.id }
          end

          def settings_params
            params.require(:tax_declaration_settings).permit(
              :legal_text,
              :legal_text_version,
              :document_signatory_id,
              :acknowledge_legal_ownership
            )
          end
        end
      end
    end
  end
end
