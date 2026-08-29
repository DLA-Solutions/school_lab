# frozen_string_literal: true

module TemplateMailHelpers
  def template_alias_for(mail)
    mail[SchoolLab::EmailGatewayDeliveryMethod::TEMPLATE_ALIAS_HEADER].to_s
  end

  def template_model_for(mail)
    JSON.parse(mail[SchoolLab::EmailGatewayDeliveryMethod::TEMPLATE_MODEL_HEADER].to_s).symbolize_keys
  end

  def template_tag_for(mail)
    mail[SchoolLab::EmailGatewayDeliveryMethod::TEMPLATE_TAG_HEADER]&.to_s
  end
end

RSpec.configure do |config|
  config.include TemplateMailHelpers

  config.before do
    Gateways::Email::Fake.reset!
    Gateways::Email::Registry.reset!
  end
end
