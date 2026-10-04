# frozen_string_literal: true

require "prawn"

module Academic
  # The "Ata" (BC7) as a document: one page with the student's record, the two structured fields a
  # family's concerns go through (BR-IN-prompted "pontos trazidos pelos pais" / "respostas da
  # escola"), the free-text description when one was written, and -- once filled -- the BR-IN08
  # approval slots.
  #
  # The only Prawn renderer for an incident: there is no separate "real document" for an Ata yet
  # (unlike report cards/contracts), but this is still built as the one shared renderer so a future
  # publish-to-PDF path has somewhere to plug in instead of growing a second drawing routine for
  # the same record.
  class RenderIncidentPdfService < ApplicationService
    MARGIN = 56

    def initialize(incident:)
      @incident = incident
    end

    def call
      ResponseService.success(data: { pdf: render, filename: filename })
    rescue Prawn::Errors::IncompatibleStringEncoding => e
      # Prawn's built-in fonts are Windows-1252, which covers Portuguese in full but not every
      # alphabet. A name or a free-text field outside it must surface as a clear refusal rather
      # than a 500.
      Rails.logger.error(
        { event: "incident.pdf_encoding_unsupported", school_id: incident.school_id,
          incident_id: incident.id, message: e.message }.to_json
      )

      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.incident_pdf_unsupported_characters") ] }
      )
    end

    private

    attr_reader :incident

    def filename
      "ata-#{incident.student.name.parameterize}-#{incident.id}.pdf"
    end

    def render
      Prawn::Fonts::AFM.hide_m17n_warning = true

      Prawn::Document.new(page_size: "A4", page_layout: :portrait, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"

        heading(pdf)
        facts(pdf)
        body_fields(pdf)
        approvals(pdf)
      end.render
    end

    def heading(pdf)
      pdf.text incident.school.name.to_s, size: 14, style: :bold
      pdf.text I18n.t("reports.incident.title"), size: 12
      pdf.text "#{I18n.t('reports.issued_on')} #{incident.created_at.to_date.strftime('%d/%m/%Y')}",
               size: 8, color: "666666"
      pdf.move_down 16
    end

    def facts(pdf)
      rows = [
        [ I18n.t("reports.incident.student"), incident.student.name.to_s ],
        [ I18n.t("reports.incident.type"), incident.incident_type&.name.to_s ],
        [ I18n.t("reports.incident.category"), category_label ],
        [ I18n.t("reports.incident.severity"), incident.severity.presence || "-" ],
        [ I18n.t("reports.incident.status"), status_label ]
      ]

      rows.each { |label, value| pdf.text "#{label}: #{value}", size: 9, color: "444444" }
      pdf.move_down 16
    end

    def body_fields(pdf)
      section(pdf, I18n.t("reports.incident.guardian_points_raised"), incident.guardian_points_raised)
      section(pdf, I18n.t("reports.incident.school_response"), incident.school_response)
      return if incident.description.blank?

      section(pdf, I18n.t("reports.incident.description"), incident.description)
    end

    def section(pdf, label, text)
      return if text.blank?

      pdf.text label, size: 10, style: :bold
      pdf.move_down 4
      pdf.text text.to_s, size: 10, align: :justify, leading: 2
      pdf.move_down 14
    end

    # Role labels, not people's names (BR-IN08's two slots are fixed role templates, not
    # individuals) -- whoever filled "coordination" or "director" at the time, and when.
    def approvals(pdf)
      return unless incident.coordination_approved_at.present? || incident.director_approved_at.present?

      pdf.text I18n.t("reports.incident.approvals"), size: 10, style: :bold
      pdf.move_down 4

      approval_line(pdf, I18n.t("reports.incident.coordination_approval"), incident.coordination_approved_at)
      approval_line(pdf, I18n.t("reports.incident.director_approval"), incident.director_approved_at)
    end

    def approval_line(pdf, label, approved_at)
      return if approved_at.blank?

      pdf.text "#{label}: #{approved_at.strftime('%d/%m/%Y %H:%M')}", size: 9, color: "444444"
    end

    def category_label
      I18n.t("reports.incident.categories.#{incident.category}", default: incident.category.to_s)
    end

    def status_label
      I18n.t("reports.incident.statuses.#{incident.status}", default: incident.status.to_s)
    end
  end
end
