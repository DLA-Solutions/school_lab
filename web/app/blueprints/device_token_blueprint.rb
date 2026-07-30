# frozen_string_literal: true

class DeviceTokenBlueprint < Blueprinter::Base
  identifier :id

  fields :token, :platform, :created_at
end
