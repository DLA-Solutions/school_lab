# frozen_string_literal: true

module JsonHelpers
  def json
    response.parsed_body
  end
end

module AuthHelpers
  def auth_headers_for(user)
    result = Auth::EncodeAccessTokenService.call(user: user)
    { "Authorization" => "Bearer #{result.data[:access_token]}" }
  end
end

RSpec.configure do |config|
  config.include JsonHelpers, type: :request
  config.include AuthHelpers, type: :request
  config.include FactoryBot::Syntax::Methods

  config.before(type: :request) do
    host! "www.example.com"
  end
end
