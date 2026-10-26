# frozen_string_literal: true

module Billing
  # Copies the boleto/Pix presentation fields a provider re-read (`fetch_invoice`) carries onto
  # the ChargeIssuance, then refreshes the charge's cached boleto/Pix columns.
  #
  # Needed for Inter, whose issuance is asynchronous: `adapter#issue` returns only a request id,
  # so the digitable line, barcode, our number and Pix copy-and-paste arrive on a later read.
  # Cora/Fake fill every field at issue time, so for them this is a no-op.
  #
  # Only blank columns are filled, never overwritten — a value the provider already handed us
  # stays authoritative, and a partial answer (Pix ready before the boleto) is kept.
  class BackfillIssuancePresentationService < ApplicationService
    FIELDS = %i[boleto_url digitable_line barcode our_number pix_emv].freeze

    def initialize(issuance:, invoice:)
      @issuance = issuance
      @invoice = invoice
    end

    def call
      attributes = missing_attributes
      return ResponseService.success(data: :unchanged) if attributes.empty?

      issuance.update!(attributes)
      issuance.charge.sync_invoice_cache!
      ResponseService.success(data: :filled)
    end

    private

    attr_reader :issuance, :invoice

    def missing_attributes
      FIELDS.each_with_object({}) do |field, attributes|
        next if issuance.public_send(field).present?

        value = invoice.public_send(field) if invoice.respond_to?(field)
        attributes[field] = value if value.present?
      end
    end
  end
end
