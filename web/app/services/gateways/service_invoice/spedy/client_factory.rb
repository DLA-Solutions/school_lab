# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    module Spedy
      # Builds the Spedy client for a school's own credential, honouring the per-school base URL
      # stored in `settings["base_url"]` (default / ENV URL when absent).
      module ClientFactory
        module_function

        def for_config(config)
          build(api_key: config.api_key, base_url: config.base_url)
        end

        def build(api_key:, base_url: nil)
          SchoolLab::Integrations::Spedy::Client.new(api_key: api_key, api_urls: api_urls(base_url))
        end

        def api_urls(base_url = nil)
          { api_base_url: effective_base_url(base_url) }
        end

        def effective_base_url(base_url = nil)
          SchoolLab::Integrations::Spedy::Configuration.normalize_base_url(base_url) ||
            SchoolLab::Integrations::Spedy::Configuration.current.fetch(:api_base_url)
        end
      end
    end
  end
end
