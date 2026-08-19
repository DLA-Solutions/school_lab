# frozen_string_literal: true

module Platform
  class ListPlatformInvoicesService < ApplicationService
    def initialize(subscription:)
      @subscription = subscription
    end

    def call
      scope = subscription.platform_invoices.order(created_at: :desc)
      ResponseService.success(data: scope)
    end

    private

    attr_reader :subscription
  end
end
