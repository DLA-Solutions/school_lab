# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Provisioning
        class ImportsController < Schools::BaseController
          def create
            authorize :provisioning_import, :create?, policy_class: ProvisioningImportPolicy

            render_not_implemented
          end
        end
      end
    end
  end
end
