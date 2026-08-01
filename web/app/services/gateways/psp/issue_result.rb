# frozen_string_literal: true

module Gateways
  module Psp
    IssueResult = Data.define(:provider_invoice_id, :boleto_url, :pix_copy_paste)
  end
end
