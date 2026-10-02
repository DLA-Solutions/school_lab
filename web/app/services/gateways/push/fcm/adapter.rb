# frozen_string_literal: true

module Gateways
  module Push
    module Fcm
      class Adapter
        include Interface

        def initialize(client: nil)
          @client = client || with_port_errors { build_client }
        end

        def deliver(token:, title:, body:, data: {})
          response = with_port_errors { client.send_message(token: token, title: title, body: body, data: data) }
          ValueObjects::DeliveryResult.new(message_id: response["name"])
        end

        private

        attr_reader :client

        def with_port_errors
          yield
        rescue SchoolLab::Integrations::Fcm::Error, SchoolLab::Http::ConnectionError => e
          raise ErrorMapper.map(e)
        end

        def build_client
          config = SchoolLab::Integrations::Fcm::Configuration
          SchoolLab::Integrations::Fcm::Client.new(
            client_email: config.client_email,
            private_key: config.private_key,
            project_id: config.project_id,
            token_cache: SchoolLab::Integrations::Fcm::TokenCache.new(client_email: config.client_email)
          )
        end
      end
    end
  end
end
