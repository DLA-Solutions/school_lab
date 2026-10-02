# frozen_string_literal: true

module Gateways
  module Push
    class Registry
      class << self
        def current
          @current ||= build_adapter
        end

        def current=(adapter)
          @current = adapter
        end

        def reset!
          @current = nil
        end

        private

        def build_adapter
          if SchoolLab::Integrations::Fcm::Configuration.configured?
            Fcm::Adapter.new
          else
            Fake.new
          end
        end
      end
    end
  end
end
