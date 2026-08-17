# frozen_string_literal: true

module ReportCards
  # Creates the next versioned report card configuration (BR-RC01).
  class UpsertConfigService < ApplicationService
    def initialize(school:, created_by_membership:, params:)
      @school = school
      @created_by_membership = created_by_membership
      @params = params
    end

    def call
      signatory = school.document_signatories.active.find(params[:document_signatory_id])
      next_version = (ReportCardConfig.where(school: school).maximum(:version) || 0) + 1

      config = ReportCardConfig.create!(
        school: school,
        version: next_version,
        template_key: params[:template_key].presence || ReportCardConfig::DEFAULT_TEMPLATE_KEY,
        display_config: params[:display_config].presence || {},
        header_text: params[:header_text],
        footer_text: params[:footer_text],
        document_signatory: signatory,
        created_by_membership: created_by_membership
      )

      ResponseService.success(data: config)
    rescue ActiveRecord::RecordNotFound
      ResponseService.failure(code: :not_found, details: { document_signatory_id: [ "not found" ] })
    end

    private

    attr_reader :school, :created_by_membership, :params
  end
end
