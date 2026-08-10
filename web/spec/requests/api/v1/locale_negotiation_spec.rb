# frozen_string_literal: true

require "rails_helper"

# The SPA sends `Accept-Language` on every call so that an error printed under a field reads in
# the same language as the field's own label. Until this existed the API answered every request in
# the default locale, whatever the caller asked for.
RSpec.describe "Locale negotiation", type: :request do
  let(:path) { "/api/v1/auth/login" }
  let(:credentials) { { email: "nobody@example.com", password: "wrong", client: "web" } }

  def login(accept_language: nil)
    headers = { "CONTENT_TYPE" => "application/json" }
    headers["Accept-Language"] = accept_language if accept_language

    post path, params: credentials.to_json, headers: headers
    response.parsed_body.dig("error", "message")
  end

  it "answers in Portuguese when nothing is asked for" do
    expect(login).to eq(I18n.t("api.errors.invalid_credentials", locale: :"pt-BR"))
  end

  it "answers in English when the caller asks for it" do
    expect(login(accept_language: "en-US")).to eq(
      I18n.t("api.errors.invalid_credentials", locale: :en)
    )
  end

  # We carry one variant of each language: answering a Portuguese speaker in English over a
  # region subtag would be absurd.
  it "treats any Portuguese tag as pt-BR" do
    expect(login(accept_language: "pt")).to eq(
      I18n.t("api.errors.invalid_credentials", locale: :"pt-BR")
    )
    expect(login(accept_language: "pt-PT")).to eq(
      I18n.t("api.errors.invalid_credentials", locale: :"pt-BR")
    )
  end

  it "picks the first tag it actually speaks from a browser's list" do
    expect(login(accept_language: "fr-FR,fr;q=0.9,en;q=0.8")).to eq(
      I18n.t("api.errors.invalid_credentials", locale: :en)
    )
  end

  it "falls back to the default rather than answering in a language nobody asked for" do
    expect(login(accept_language: "ja-JP")).to eq(
      I18n.t("api.errors.invalid_credentials", locale: :"pt-BR")
    )
  end

  # `I18n.locale` is per-thread, and a server that reuses threads would otherwise leak one
  # request's language into the next.
  it "does not leave the locale changed for the next request" do
    login(accept_language: "en-US")

    expect(I18n.locale).to eq(I18n.default_locale)
    expect(login).to eq(I18n.t("api.errors.invalid_credentials", locale: :"pt-BR"))
  end
end
