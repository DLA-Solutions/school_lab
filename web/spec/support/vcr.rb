# frozen_string_literal: true

require "vcr"

VCR.configure do |config|
  config.cassette_library_dir = Rails.root.join("spec/cassettes")
  config.hook_into :webmock
  config.default_cassette_options = { record: :once }
  config.configure_rspec_metadata!

  config.filter_sensitive_data("<AUTHORIZATION>") do |interaction|
    interaction.request.headers["Authorization"]&.first
  end

  %w[client_id access_token].each do |key|
    config.filter_sensitive_data("<#{key.upcase}>") do |interaction|
      uri = URI(interaction.request.uri)
      params = URI.decode_www_form(uri.query.to_s).to_h
      params[key]
    end
  end

  config.before_record do |interaction|
    body = interaction.response.body.to_s
    interaction.response.body = body.gsub(/-----BEGIN [A-Z ]+-----.*?-----END [A-Z ]+-----/m, "<PEM>")
  end
end
