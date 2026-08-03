# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Cora
      class ValidationError < Error
        attr_reader :details

        def initialize(message = "Provider validation error", details: nil)
          super(message)
          @details = details
        end
      end
    end
  end
end
