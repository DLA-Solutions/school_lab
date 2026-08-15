# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class SettingsController < BaseController
          def show
            settings = ::Billing::SchoolSettings.for(Current.school)
            authorize settings_record_for(settings), :show?

            render json: { data: SchoolBillingSettingsBlueprint.render_as_hash(settings) }
          end

          def update
            settings = ::Billing::SchoolSettings.for(Current.school)
            authorize settings_record_for(settings), :update?

            result = ::Billing::UpdateSchoolSettingsService.call(school: Current.school, params: settings_params)
            render_service_result(result) do |data|
              render json: { data: SchoolBillingSettingsBlueprint.render_as_hash(data) }
            end
          end

          private

          def settings_record_for(settings)
            SchoolBillingSettings.find_by(school_id: settings.school_id) ||
              SchoolBillingSettings.new(school_id: settings.school_id)
          end

          def settings_params
            params.require(:billing_settings).permit(
              :overdue_grace_days,
              :service_description,
              :interest_rate_percent,
              :early_payment_discount_percent,
              :early_payment_discount_day,
              :fine_type,
              :fine_rate_percent,
              :fine_amount_cents,
              notification_schedule: { reminders: %i[days_before_due days_after_due] }
            )
          end
        end
      end
    end
  end
end
