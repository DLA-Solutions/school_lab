# frozen_string_literal: true

module Billing
  class IssueServiceInvoiceJob < ApplicationJob
    queue_as :billing

    MAX_ATTEMPTS = 5

    retry_on Gateways::ServiceInvoice::TransientError, wait: :polynomially_longer, attempts: MAX_ATTEMPTS

    discard_on ActiveRecord::RecordNotFound

    def perform(payment_id, school_id)
      school = School.find(school_id)
      payment = school.payments.find(payment_id)
      Billing::IssueServiceInvoiceService.call(payment: payment)
    end
  end
end
