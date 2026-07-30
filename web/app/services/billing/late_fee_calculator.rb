# frozen_string_literal: true

module Billing
  class LateFeeCalculator
    # Placeholder until late-fee discovery (T5) completes.
    def self.call(charge:)
      0.to_d
    end
  end
end
