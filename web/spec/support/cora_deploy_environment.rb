# frozen_string_literal: true

# Which Cora endpoints the deploy talks to. It is deploy configuration rather than data, so
# specs that need the production hosts switch it around the example instead of creating a row.
module CoraDeployEnvironment
  def with_cora_environment(environment)
    original = Rails.application.config.x.billing.cora_environment
    Rails.application.config.x.billing.cora_environment = environment
    yield
  ensure
    Rails.application.config.x.billing.cora_environment = original
  end
end

RSpec.configure do |config|
  config.include CoraDeployEnvironment
end
