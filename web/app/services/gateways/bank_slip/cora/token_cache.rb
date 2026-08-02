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

        # No TTL here: the provider dictates the token lifetime, so the block is responsible
        # for writing the entry with the TTL derived from its `expires_in`.
        def fetch
          cached = cache.read(cache_key)
          return cached if cached

          yield
        end

        def delete
          cache.delete(cache_key)
        end

        # A non-positive TTL means the safety margin covers the whole token lifetime:
        # caching it would risk serving a token the provider already expired.
        def write(token, expires_in:)
          return token unless expires_in.positive?

          cache.write(cache_key, token, expires_in: expires_in)
          token
        end

        private

        attr_reader :school_id, :provider, :environment, :cache

        def cache_key
          "bank_slip/token/#{school_id}/#{provider}/#{environment}"
        end
      end
    end
  end
end
