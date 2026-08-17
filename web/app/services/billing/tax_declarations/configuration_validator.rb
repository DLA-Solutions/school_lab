# frozen_string_literal: true

module Billing
  module TaxDeclarations
    class ConfigurationValidator
      def self.call(school:, guardian:, settings:)
        new(school: school, guardian: guardian, settings: settings).call
      end

      def initialize(school:, guardian:, settings:)
        @school = school
        @guardian = guardian
        @settings = settings
      end

      def call
        blockers = []
        blockers << :school_legal_name unless school.name.present?
        blockers << :school_cnpj unless Cnpj.valid?(school.cnpj)
        blockers << :payer_name unless guardian.name.present?
        blockers << :payer_cpf unless Cpf.valid?(guardian.cpf)
        blockers << :legal_text unless settings.legal_text.present?
        blockers << :legal_text_version unless settings.legal_text_version.present?
        blockers << :document_signatory unless active_signatory.present?
        blockers << :legal_accounting_approval unless settings.legal_accounting_approved_at.present?
        blockers << :purpose_configuration_digest unless settings.approved_purpose_configuration_digest.present?

        if blockers.empty?
          ResponseService.success(data: { signatory: active_signatory })
        else
          ResponseService.failure(code: :tax_declaration_configuration_incomplete, details: { blockers: blockers })
        end
      end

      private

      attr_reader :school, :guardian, :settings

      def active_signatory
        return @active_signatory if defined?(@active_signatory)

        signatory = settings.document_signatory
        @active_signatory = signatory if signatory&.kept?
      end
    end
  end
end
