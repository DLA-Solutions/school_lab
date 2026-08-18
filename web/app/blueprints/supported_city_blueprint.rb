# frozen_string_literal: true

class SupportedCityBlueprint < Blueprinter::Base
  field :code
  field :name
  field :state
  field :provider
  field :provider_options
end
