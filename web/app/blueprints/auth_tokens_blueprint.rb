# frozen_string_literal: true

class AuthTokensBlueprint < Blueprinter::Base
  field :access_token
  field :access_expires_at
  field :refresh_token, if: ->(_field_name, object, _options) { object[:refresh_token].present? }
  field :refresh_expires_at, if: ->(_field_name, object, _options) { object[:refresh_expires_at].present? }

  association :user, blueprint: UserBlueprint do |object, _options|
    object[:user]
  end
end
