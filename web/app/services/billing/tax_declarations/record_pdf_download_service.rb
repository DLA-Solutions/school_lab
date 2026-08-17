# frozen_string_literal: true

module Billing
  module TaxDeclarations
    class RecordPdfDownloadService < ApplicationService
      def initialize(version:, guardian:, actor:, request_uuid:)
        @version = version
        @guardian = guardian
        @actor = actor
        @request_uuid = request_uuid
      end

      def call
        return ResponseService.failure(code: :validation_error, details: { request_uuid: [ "blank" ] }) if request_uuid.blank?

        existing = TaxDeclarationAccessEvent.find_by(request_uuid: request_uuid)
        return ResponseService.success(data: existing) if existing

        occurred_at = Time.current
        event = TaxDeclarationAccessEvent.create!(
          school: version.school,
          tax_declaration: version.tax_declaration,
          tax_declaration_version: version,
          guardian: guardian,
          actor_user: actor,
          event_type: "pdf_download",
          request_uuid: request_uuid,
          occurred_at: occurred_at
        )

        EventEmitter.tax_declaration_pdf_downloaded(access_event: event)
        ResponseService.success(data: event)
      rescue ActiveRecord::RecordNotUnique
        ResponseService.success(data: TaxDeclarationAccessEvent.find_by!(request_uuid: request_uuid))
      end

      private

      attr_reader :version, :guardian, :actor, :request_uuid
    end
  end
end
