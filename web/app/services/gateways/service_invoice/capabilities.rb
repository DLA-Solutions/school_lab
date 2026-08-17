# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    Capabilities = Data.define(:correction_letter, :cancellation, :national_layout)
  end
end
