# frozen_string_literal: true

require "rails_helper"

# Two message catalogues drift the moment someone adds a key to one of them. There is no
# `i18n.fallbacks` on purpose — a fallback would paper over the gap by printing an English
# sentence in the middle of a Portuguese screen — so the missing key raises at the point of use
# instead. This finds it earlier than that: at the point of writing.
RSpec.describe "Locale catalogues" do
  def flatten_keys(hash, prefix = "")
    hash.flat_map do |key, value|
      path = prefix.empty? ? key.to_s : "#{prefix}.#{key}"

      value.is_a?(Hash) ? flatten_keys(value, path) : [ path ]
    end
  end

  def keys_for(locale)
    file = Rails.root.join("config/locales/#{locale}.yml")
    flatten_keys(YAML.load_file(file).fetch(locale)).to_set
  end

  let(:portuguese) { keys_for("pt-BR") }
  let(:english) { keys_for("en") }

  it "says the same things in both languages" do
    missing_in_english = (portuguese - english).sort
    missing_in_portuguese = (english - portuguese).sort

    expect(missing_in_english).to be_empty,
                                  "Missing from config/locales/en.yml:\n  #{missing_in_english.join("\n  ")}"
    expect(missing_in_portuguese).to be_empty,
                                     "Missing from config/locales/pt-BR.yml:\n  #{missing_in_portuguese.join("\n  ")}"
  end

  # A key whose "translation" is the other language's text is worse than a missing one: nothing
  # raises, and it reaches a customer looking deliberate.
  it "does not leave a Portuguese string sitting in the English catalogue" do
    untranslated = portuguese.select do |key|
      I18n.t(key, locale: :"pt-BR", default: nil).present? &&
        I18n.t(key, locale: :"pt-BR", default: nil) == I18n.t(key, locale: :en, default: nil) &&
        I18n.t(key, locale: :en, default: "").to_s.match?(/[ãõçáéíóúâêôÁÉÍÓÚÂÊÔÃÕÇ]/)
    end

    expect(untranslated).to be_empty
  end

  it "ships exactly the locales the application declares" do
    on_disk = Dir[Rails.root.join("config/locales/*.yml")].map { |path| File.basename(path, ".yml") }

    expect(on_disk.map(&:to_sym)).to match_array(I18n.available_locales)
  end
end
