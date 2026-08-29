# frozen_string_literal: true

# Local environments and RSpec must never deliver through a mail provider API.
# RSpec under RAILS_ENV=production still forces :email_gateway (Fake adapter) so a leftover
# token cannot send real Postmark mail. Live app processes are unchanged.
require_relative "../../lib/school_lab/email_delivery"

if Rails.env.test? || SchoolLab::EmailDelivery.rspec_cli?
  ActionMailer::Base.delivery_method = :email_gateway
end

if SchoolLab::EmailDelivery.delivery_disabled? && !SchoolLab::EmailDelivery.local_delivery_enabled?
  ActionMailer::Base.perform_deliveries = false
end

if (Rails.env.local? || SchoolLab::EmailDelivery.rspec_cli?) &&
    ActionMailer::Base.delivery_method == :postmark
  raise "Action Mailer must not use :postmark in #{Rails.env}. " \
        "Use :email_gateway (Fake adapter) in development and test."
end
