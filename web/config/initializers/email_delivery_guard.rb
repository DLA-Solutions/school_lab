# frozen_string_literal: true

# Local environments must never deliver through a mail provider API.
if Rails.env.local? && ActionMailer::Base.delivery_method == :postmark
  raise "Action Mailer must not use :postmark in #{Rails.env}. " \
        "Use Letter Opener in development and :test in RSpec."
end
