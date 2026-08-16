# frozen_string_literal: true

module Billing
  module TaxDeclarations
    class EnsureGeneratedService < ApplicationService
      Result = Data.define(:declaration, :version, :created)

      def initialize(school:, guardian:, calendar_year:)
        @school = school
        @guardian = guardian
        @calendar_year = calendar_year.to_i
      end

      def call
        return ResponseService.failure(code: :calendar_year_not_closed) unless CalendarYear.closed?(school: school, calendar_year: calendar_year)

        settings = TaxDeclarationSetting.for(school)
        config = ConfigurationValidator.call(school: school, guardian: guardian, settings: settings)
        return config if config.failure?

        lines_result = BuildLineItemsService.call(
          school: school,
          guardian: guardian,
          calendar_year: calendar_year
        )
        return lines_result if lines_result.failure?

        lines = lines_result.data
        digest = CalculationDigest.compute(
          lines: digest_lines(lines),
          settings: settings
        )

        with_generation_lock do
          declaration = TaxDeclaration.find_or_create_by!(
            school: school,
            guardian: guardian,
            calendar_year: calendar_year
          )

          current = declaration.active_version
          if current&.calculation_digest == digest
            return ResponseService.success(data: Result.new(declaration: declaration, version: current, created: false))
          end

          version = create_version!(
            declaration: declaration,
            settings: settings,
            signatory: config.data.fetch(:signatory),
            lines: lines,
            digest: digest,
            supersedes: current
          )
          return version if version.is_a?(ResponseService)

          ResponseService.success(data: Result.new(declaration: declaration, version: version, created: true))
        end
      rescue ActiveRecord::RecordNotUnique
        ResponseService.failure(code: :generation_in_progress)
      end

      private

      attr_reader :school, :guardian, :calendar_year

      def with_generation_lock(&block)
        ActiveRecord::Base.transaction do
          lock_key = Zlib.crc32("tax_declaration:#{school.id}:#{guardian.id}:#{calendar_year}")
          acquired = ActiveRecord::Base.connection.select_value(
            ActiveRecord::Base.sanitize_sql_array([ "SELECT pg_try_advisory_xact_lock(?)", lock_key ])
          )
          return ResponseService.failure(code: :generation_in_progress) unless acquired

          yield
        end
      end

      def digest_lines(lines)
        lines.map do |line|
          CalculationDigest::Line.new(
            payment_id: line.payment.id,
            charge_id: line.charge.id,
            billing_purpose_code: line.billing_purpose_code,
            tax_declaration_eligible: line.charge.tax_declaration_eligible,
            declared_principal_amount_cents: line.declared_principal_amount_cents
          )
        end
      end

      def create_version!(declaration:, settings:, signatory:, lines:, digest:, supersedes:)
        total = lines.sum(&:declared_principal_amount_cents)
        version_number = (declaration.tax_declaration_versions.maximum(:version) || 0) + 1
        issued_at = Time.current
        verification_code = SecureRandom.alphanumeric(12).upcase
        calculation_snapshot = build_calculation_snapshot(lines, total)
        school_snapshot = school_identity_snapshot
        payer_snapshot = payer_identity_snapshot
        signatory_snapshot_data = signatory_snapshot(signatory)
        purpose_snapshot = purpose_configuration_snapshot(settings)
        approval_data = approval_snapshot(settings)

        pdf_result = RenderVersionPdfService.call(
          snapshot: RenderVersionPdfService::Snapshot.new(
            calendar_year: calendar_year,
            total_declared_principal_amount_cents: total,
            verification_code: verification_code,
            school_identity_snapshot: school_snapshot,
            payer_identity_snapshot: payer_snapshot,
            document_signatory_snapshot: signatory_snapshot_data,
            legal_text_snapshot: settings.legal_text,
            line_items: lines
          )
        )
        return pdf_result if pdf_result.failure?

        pdf_storage_key = upload_pdf!(pdf_result.data.fetch(:pdf))

        version = nil
        ActiveRecord::Base.transaction do
          version = declaration.tax_declaration_versions.create!(
            school: school,
            version: version_number,
            supersedes: supersedes,
            calculation_digest: digest,
            total_declared_principal_amount_cents: total,
            settings_version: settings.configuration_version,
            school_identity_snapshot: school_snapshot,
            payer_identity_snapshot: payer_snapshot,
            legal_text_snapshot: settings.legal_text,
            legal_text_version_snapshot: settings.legal_text_version,
            document_signatory_snapshot: signatory_snapshot_data,
            purpose_configuration_snapshot: purpose_snapshot,
            approval_snapshot: approval_data,
            calculation_snapshot: calculation_snapshot,
            verification_code: verification_code,
            pdf_storage_key: pdf_storage_key,
            issued_at: issued_at
          )

          lines.each do |line|
            version.tax_declaration_items.create!(
              school: school,
              student: line.student,
              payment: line.payment,
              charge: line.charge,
              billing_purpose_code: line.billing_purpose_code,
              paid_at: line.paid_at,
              source_paid_amount_cents: line.source_paid_amount_cents,
              source_fine_amount_cents: line.source_fine_amount_cents,
              source_interest_amount_cents: line.source_interest_amount_cents,
              declared_principal_amount_cents: line.declared_principal_amount_cents
            )
          end

          declaration.update!(active_version: version)
        end

        if supersedes.present?
          EventEmitter.tax_declaration_superseded(version: version)
        else
          EventEmitter.tax_declaration_generated(version: version)
        end

        version
      end

      def upload_pdf!(bytes)
        key = "tax_declarations/#{school.id}/#{SecureRandom.uuid}.pdf"
        ActiveStorage::Blob.create_and_upload!(
          io: StringIO.new(bytes),
          filename: "tax-declaration.pdf",
          content_type: "application/pdf",
          key: key
        )
        key
      end

      def school_identity_snapshot
        {
          legal_name: school.name,
          cnpj: school.cnpj,
          formatted_cnpj: school.formatted_cnpj,
          address: school.address
        }
      end

      def payer_identity_snapshot
        {
          id: guardian.id,
          name: guardian.name,
          cpf: guardian.cpf,
          formatted_cpf: guardian.formatted_cpf
        }
      end

      def signatory_snapshot(signatory)
        {
          id: signatory.id,
          name: signatory.name,
          role_label: signatory.role_label
        }
      end

      def purpose_configuration_snapshot(settings)
        Billing::PurposeConfigurationDigest.snapshot_for(school).merge(
          configuration_version: settings.configuration_version,
          approved_purpose_configuration_digest: settings.approved_purpose_configuration_digest
        )
      end

      def approval_snapshot(settings)
        {
          legal_accounting_approved_at: settings.legal_accounting_approved_at&.iso8601,
          approved_by_id: settings.approved_by_id,
          configuration_version: settings.configuration_version,
          approved_purpose_configuration_digest: settings.approved_purpose_configuration_digest
        }
      end

      def build_calculation_snapshot(lines, total)
        students = lines.group_by { |line| line.student.id }.map do |student_id, grouped|
          student = grouped.first.student
          {
            student_id: student_id,
            student_name: student.name,
            declared_principal_amount_cents: grouped.sum(&:declared_principal_amount_cents)
          }
        end

        purposes = lines.group_by(&:billing_purpose_code).transform_values do |grouped|
          grouped.sum(&:declared_principal_amount_cents)
        end

        {
          calendar_year: calendar_year,
          total_declared_principal_amount_cents: total,
          students: students.sort_by { |row| row[:student_id] },
          purposes: purposes,
          source_payment_ids: lines.map { |line| line.payment.id }.sort
        }
      end
    end
  end
end
