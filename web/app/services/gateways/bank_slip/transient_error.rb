# frozen_string_literal: true

module Gateways
  module BankSlip
    # Retryable by background jobs (Solid Queue retry_on).
    class TransientError < Error; end
  end
end
