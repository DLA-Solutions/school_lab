# frozen_string_literal: true

require_relative "../../lib/school_lab/email_gateway_delivery_method"

ActionMailer::Base.add_delivery_method :email_gateway, SchoolLab::EmailGatewayDeliveryMethod
