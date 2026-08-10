# frozen_string_literal: true

# One locale, and it is the one the interface is written in. The default used to be `pt-BR` while
# the SPA presented itself as English, so every validation message and every API error arrived in
# the other language.
#
# A second locale needs more than a file: nothing here reads `Accept-Language`, so requests would
# all still resolve to the default. Add the negotiation at the same time as the translation.
Rails.application.config.i18n.default_locale = :en
Rails.application.config.i18n.available_locales = %i[en]
