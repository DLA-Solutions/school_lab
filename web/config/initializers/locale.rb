# frozen_string_literal: true

# Two locales, and pt-BR answers when nothing says otherwise — the schools using this are
# Brazilian, so Portuguese is the language a request arrives in unless it asks for another.
#
# No fallback on purpose: a key present in one file and missing from the other would otherwise
# surface as an English sentence in the middle of a Portuguese screen, silently. Without a
# fallback it raises in development, where it is cheap to notice — `spec/locale_parity_spec.rb`
# is what stops it reaching a release.
Rails.application.config.i18n.default_locale = :"pt-BR"
Rails.application.config.i18n.available_locales = %i[pt-BR en]
