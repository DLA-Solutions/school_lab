# frozen_string_literal: true

class NotificationBlueprint < Blueprinter::Base
  identifier :id

  fields :kind, :title, :body, :created_at

  field :read do |notification, _options|
    notification.read?
  end

  field :school_id
  field :contract_id
end
