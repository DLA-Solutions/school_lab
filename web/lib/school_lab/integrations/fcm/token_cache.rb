# frozen_string_literal: true

require "digest"

module SchoolLab
  module Integrations
    module Fcm
      class TokenCache
        # No `school_id` scoping: unlike Cora (per-school bank credentials), FCM is one
        # platform-wide Firebase project — the cache key is stable per service-account identity
        # (`client_email`), not per tenant.
        def initialize(client_email:, cache: Rails.cache)
          @client_email = client_email
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

        # A non-positive TTL means the safety margin covers the whole token lifetime: caching it
        # would risk serving a token the provider already expired.
        def write(token, expires_in:)
          return token unless expires_in.positive?

          cache.write(cache_key, token, expires_in: expires_in)
          token
        end

        private

        attr_reader :client_email, :cache

        def cache_key
          email_digest = Digest::SHA256.hexdigest(client_email)
          "push/fcm/token/#{email_digest}"
        end
      end
    end
  end
end
