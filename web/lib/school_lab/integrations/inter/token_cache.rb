# frozen_string_literal: true

require "digest"

module SchoolLab
  module Integrations
    module Inter
      class TokenCache
        # `token_url` is the deploy's Inter token endpoint, not a school attribute: it keeps a
        # token minted for one deploy from being replayed against another when URLs change
        # over a shared cache.
        def initialize(school_id:, provider:, token_url:, cache: Rails.cache)
          @school_id = school_id
          @provider = provider
          @token_url = token_url
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

        attr_reader :school_id, :provider, :token_url, :cache

        def cache_key
          token_url_digest = Digest::SHA256.hexdigest(token_url)
          "bank_slip/token/#{school_id}/#{provider}/#{token_url_digest}"
        end
      end
    end
  end
end
