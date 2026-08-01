# frozen_string_literal: true

module Gateways
  module BankSlip
    module Cora
      class TokenCache
        def initialize(school_id:, provider:, environment:, cache: Rails.cache)
          @school_id = school_id
          @provider = provider
          @environment = environment
          @cache = cache
        end

        def fetch(&block)
          cache.fetch(cache_key, expires_in: expires_in, &block)
        end

        def delete
          cache.delete(cache_key)
        end

        def write(token, expires_in:)
          cache.write(cache_key, token, expires_in: expires_in)
        end

        private

        attr_reader :school_id, :provider, :environment, :cache

        def cache_key
          "bank_slip/token/#{school_id}/#{provider}/#{environment}"
        end

        def expires_in
          23.hours
        end
      end
    end
  end
end
