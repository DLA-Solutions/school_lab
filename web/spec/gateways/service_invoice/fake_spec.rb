# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::ServiceInvoice::Fake do
  it_behaves_like "a service invoice adapter", "fake"
end
