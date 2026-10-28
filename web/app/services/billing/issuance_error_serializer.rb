# frozen_string_literal: true

module Billing
  # Serializes the full failure of an issuance attempt to the JSON string stored in
  # `charge_issuances.last_error`, so a failed boleto can be diagnosed from the row alone.
  #
  #   {"error_class":"Gateways::BankSlip::ValidationError","message":"...","http_status":422,
  #    "provider_response":{...},"occurred_at":"2026-10-28T12:00:00Z"}
  #
  # Nil keys are omitted. Every string leaf (message and provider response, keys included) goes
  # through Billing::PiiRedactor BEFORE the structure is serialized, so the output stays valid
  # JSON — the redactor is never run over the JSON text itself. Request headers, tokens and
  # credentials are never read from the error. Output is capped at MAX_BYTES by shrinking string
  # leaves, never by cutting the JSON text.
  class IssuanceErrorSerializer
    MAX_BYTES = 8_192
    # Progressively smaller string-leaf limits tried until the JSON fits MAX_BYTES.
    LEAF_LIMITS = [ 1_000, 400, 150, 60 ].freeze
    KEY_LIMIT = 100
    MAX_DEPTH = 8
    MAX_ITEMS = 30
    TRUNCATED = "[truncated]"
    SUMMARY_LIMIT = 300
    CPF_INTEGER = /\A\d{11}\z/

    def self.call(error, occurred_at: Time.current)
      new(error, occurred_at: occurred_at).call
    end

    # One-line, redacted description for logs/alerts. Reads the JSON written by `.call`; legacy
    # rows holding a plain message are passed through redacted.
    def self.summary(last_error)
      text = last_error.to_s
      parsed = parse_hash(text)
      return PiiRedactor.call(text).truncate(SUMMARY_LIMIT) unless parsed&.key?("error_class")

      line = [ parsed["error_class"], parsed["message"] ].compact_blank.join(": ")
      line = "#{line} (HTTP #{parsed['http_status']})" if parsed["http_status"]
      PiiRedactor.call(line).truncate(SUMMARY_LIMIT)
    end

    def self.parse_hash(text)
      parsed = JSON.parse(text)
      parsed if parsed.is_a?(Hash)
    rescue JSON::ParserError
      nil
    end
    private_class_method :parse_hash

    def initialize(error, occurred_at:)
      @error = error
      @occurred_at = occurred_at
    end

    def call
      LEAF_LIMITS.each do |limit|
        json = build(limit, provider_response).to_json
        return json if json.bytesize <= MAX_BYTES
      end

      build(LEAF_LIMITS.last, { "truncated" => true }).to_json
    end

    private

    attr_reader :error, :occurred_at

    def build(limit, response)
      {
        "error_class" => error.class.name,
        "message" => clean(error.message, limit),
        "http_status" => http_status,
        "provider_response" => sanitize(response, limit, 0),
        "occurred_at" => occurred_at.utc.iso8601
      }.compact
    end

    def http_status
      status = error.try(:http_status)
      status if status.is_a?(Integer)
    end

    # Port errors carry the provider body; Cora validation errors only expose `details`.
    def provider_response
      error.try(:provider_response).presence || error.try(:details).presence
    end

    def sanitize(value, limit, depth)
      return TRUNCATED if depth > MAX_DEPTH

      case value
      when Hash then sanitize_hash(value, limit, depth)
      when Array then sanitize_array(value, limit, depth)
      when String then clean(value, limit)
      when Integer then value.to_s.match?(CPF_INTEGER) ? "[CPF]" : value
      when Float then value.finite? ? value : value.to_s
      when true, false, nil then value
      else clean(value.to_s, limit)
      end
    end

    def sanitize_hash(hash, limit, depth)
      result = hash.first(MAX_ITEMS).to_h do |key, nested|
        [ clean(key.to_s, KEY_LIMIT), sanitize(nested, limit, depth + 1) ]
      end
      result["_truncated_keys"] = hash.size - MAX_ITEMS if hash.size > MAX_ITEMS
      result
    end

    def sanitize_array(array, limit, depth)
      result = array.first(MAX_ITEMS).map { |nested| sanitize(nested, limit, depth + 1) }
      result << "[#{array.size - MAX_ITEMS} more items truncated]" if array.size > MAX_ITEMS
      result
    end

    # Redact first, then truncate: cutting first could leave half a PEM block the redactor no
    # longer recognizes.
    def clean(text, limit)
      redacted = PiiRedactor.call(text.to_s.dup.force_encoding(Encoding::UTF_8).scrub("?"))
      return redacted if redacted.length <= limit

      "#{redacted[0, limit]}...#{TRUNCATED}"
    end
  end
end
