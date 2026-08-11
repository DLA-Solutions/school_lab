class ApplicationMailer < ActionMailer::Base
  default from: -> { SchoolLab::EmailDelivery.from_address }
  layout "mailer"
end
