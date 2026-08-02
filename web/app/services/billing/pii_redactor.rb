# frozen_string_literal: true

module Billing
  class PiiRedactor
    PEM_BLOCK = /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/m
    BEARER_TOKEN = /Bearer\s+\S+/i
    CPF_FORMATTED = /\d{3}\.\d{3}\.\d{3}-\d{2}/
    CPF_RAW = /\b\d{11}\b/
    EMAIL = /\S+@\S+\.\S+/
    BR_PHONE = /(?:\+55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}\b/
    E164_PHONE = /\+[1-9]\d{6,14}\b/
    CLIENT_ID = /client_id(?:=|:|\s)["']?[\w-]+["']?/i

    REPLACEMENTS = [
      [ PEM_BLOCK, "[PEM_REDACTED]" ],
      [ BEARER_TOKEN, "Bearer [REDACTED]" ],
      [ CPF_FORMATTED, "[CPF]" ],
      [ CPF_RAW, "[CPF]" ],
      [ EMAIL, "[EMAIL]" ],
      [ E164_PHONE, "[PHONE]" ],
      [ BR_PHONE, "[PHONE]" ],
      [ CLIENT_ID, "client_id=[REDACTED]" ]
    ].freeze

    def self.call(text)
      new(text).call
    end

    def initialize(text)
      @text = text.to_s
    end

    def call
      REPLACEMENTS.reduce(text) do |redacted, (pattern, replacement)|
        redacted.gsub(pattern, replacement)
      end
    end

    private

    attr_reader :text
  end
end
