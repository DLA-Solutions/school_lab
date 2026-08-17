# frozen_string_literal: true

require "prawn"
require "prawn/table"

module Billing
  module TaxDeclarations
    class RenderVersionPdfService < ApplicationService
      Snapshot = Data.define(
        :calendar_year,
        :total_declared_principal_amount_cents,
        :verification_code,
        :school_identity_snapshot,
        :payer_identity_snapshot,
        :document_signatory_snapshot,
        :legal_text_snapshot,
        :line_items
      )

      MARGIN = 48

      def initialize(snapshot:)
        @snapshot = snapshot
      end

      def call
        ResponseService.success(
          data: {
            pdf: render,
            filename: "declaracao-#{snapshot.calendar_year}.pdf"
          }
        )
      end

      private

      attr_reader :snapshot

      def render
        school = snapshot.school_identity_snapshot.with_indifferent_access
        payer = snapshot.payer_identity_snapshot.with_indifferent_access
        signatory = snapshot.document_signatory_snapshot.with_indifferent_access

        Prawn::Document.new(page_size: "A4", page_layout: :portrait, margin: MARGIN) do |pdf|
          pdf.font "Helvetica"
          pdf.text school.fetch("legal_name").to_s, size: 14, style: :bold
          pdf.text "#{I18n.t('billing.tax_declaration.pdf.cnpj')}: #{school.fetch('formatted_cnpj', school['cnpj'])}",
                   size: 10
          pdf.move_down 12
          pdf.text I18n.t("billing.tax_declaration.pdf.title"), size: 12, style: :bold
          pdf.text "#{I18n.t('billing.tax_declaration.pdf.calendar_year')}: #{snapshot.calendar_year}",
                   size: 10
          pdf.move_down 12
          pdf.text "#{I18n.t('billing.tax_declaration.pdf.payer')}: #{payer.fetch('name')}", size: 10
          pdf.text "#{I18n.t('billing.tax_declaration.pdf.cpf')}: #{payer.fetch('formatted_cpf', payer['cpf'])}",
                   size: 10
          pdf.move_down 12
          pdf.text snapshot.legal_text_snapshot, size: 9
          pdf.move_down 16

          rows = student_rows
          if rows.any?
            pdf.table(
              [
                [
                  I18n.t("billing.tax_declaration.pdf.student"),
                  I18n.t("billing.tax_declaration.pdf.amount")
                ]
              ] + rows,
              width: pdf.bounds.width,
              cell_style: { size: 9, padding: 6 }
            ) do
              row(0).font_style = :bold
            end
          end

          pdf.move_down 12
          pdf.text "#{I18n.t('billing.tax_declaration.pdf.total')}: #{format_money(snapshot.total_declared_principal_amount_cents)}",
                   size: 10, style: :bold
          pdf.move_down 24
          pdf.text signatory.fetch("name").to_s, size: 10
          pdf.text signatory.fetch("role_label").to_s, size: 9
          pdf.move_down 12
          pdf.text "#{I18n.t('billing.tax_declaration.pdf.verification_code')}: #{snapshot.verification_code}",
                   size: 8
        end.render
      end

      def student_rows
        grouped = snapshot.line_items.group_by { |item| item.student.id }
        grouped.map do |_student_id, items|
          student = items.first.student
          total = items.sum(&:declared_principal_amount_cents)
          [ student.name, format_money(total) ]
        end
      end

      def format_money(cents)
        format("%.2f", cents / 100.0)
      end
    end
  end
end
