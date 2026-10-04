# frozen_string_literal: true

require "prawn"

module Academic
  # A lesson plan (BR-LP07 template) as a PDF, for the preview popup (UC-LP05, BR-LP08). Same UX
  # pattern as the Ata/incident PDF preview (RenderIncidentPdfService) -- unsandboxed blob-URL
  # iframe on the frontend, inline disposition here. Professor/Disciplina/Turma/Data are resolved
  # from `class_discipline` + `date` rather than stored on the plan itself (BR-LP01).
  class RenderLessonPlanPdfService < ApplicationService
    MARGIN = 56

    def initialize(lesson_plan:)
      @lesson_plan = lesson_plan
    end

    def call
      ResponseService.success(data: { pdf: render, filename: filename })
    rescue Prawn::Errors::IncompatibleStringEncoding => e
      # Prawn's built-in fonts are Windows-1252 -- covers Portuguese in full but not every
      # alphabet. A free-text template field outside it must surface as a clear refusal, not a 500.
      Rails.logger.error(
        { event: "lesson_plan.pdf_encoding_unsupported", school_id: lesson_plan.school_id,
          lesson_plan_id: lesson_plan.id, message: e.message }.to_json
      )

      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.lesson_plan_pdf_unsupported_characters") ] }
      )
    end

    private

    attr_reader :lesson_plan

    def class_discipline
      lesson_plan.class_discipline
    end

    def filename
      "plano-de-aula-#{class_discipline.subject.name.parameterize}-#{lesson_plan.id}.pdf"
    end

    def render
      Prawn::Fonts::AFM.hide_m17n_warning = true

      Prawn::Document.new(page_size: "A4", page_layout: :portrait, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"

        heading(pdf)
        facts(pdf)
        body_fields(pdf)
        assessment(pdf)
      end.render
    end

    def heading(pdf)
      pdf.text lesson_plan.school.name.to_s, size: 14, style: :bold
      pdf.text I18n.t("reports.lesson_plan.title"), size: 12
      pdf.text "#{I18n.t('reports.issued_on')} #{lesson_plan.created_at.to_date.strftime('%d/%m/%Y')}",
               size: 8, color: "666666"
      pdf.move_down 16
    end

    def facts(pdf)
      rows = [
        [ I18n.t("reports.lesson_plan.teacher"), class_discipline.teacher&.name.to_s.presence || "-" ],
        [ I18n.t("reports.lesson_plan.subject"), class_discipline.subject.name.to_s ],
        [ I18n.t("reports.lesson_plan.school_class"), class_discipline.school_class.name.to_s ],
        [ I18n.t("reports.lesson_plan.date"), lesson_plan.date.strftime("%d/%m/%Y") ],
        [ I18n.t("reports.lesson_plan.duration"), lesson_plan.duration.presence || "-" ],
        [ I18n.t("reports.lesson_plan.unit_stage"), lesson_plan.unit_stage.presence || "-" ],
        [ I18n.t("reports.lesson_plan.topic"), lesson_plan.topic.presence || "-" ]
      ]

      rows.each { |label, value| pdf.text "#{label}: #{value}", size: 9, color: "444444" }
      pdf.move_down 16
    end

    def body_fields(pdf)
      section(pdf, I18n.t("reports.lesson_plan.general_objective"), lesson_plan.general_objective)
      section(pdf, I18n.t("reports.lesson_plan.specific_objectives"), lesson_plan.specific_objectives)
      section(pdf, I18n.t("reports.lesson_plan.bncc_competencies"), lesson_plan.bncc_competencies)
      section(pdf, I18n.t("reports.lesson_plan.other_competencies"), lesson_plan.other_competencies)
      section(pdf, I18n.t("reports.lesson_plan.resources_materials"), lesson_plan.resources_materials)
    end

    def assessment(pdf)
      return if lesson_plan.assessment_types.blank? && lesson_plan.assessment_formats.blank?

      section(pdf, I18n.t("reports.lesson_plan.assessment_types"), labels_for(:assessment_types))
      section(pdf, I18n.t("reports.lesson_plan.assessment_formats"), labels_for(:assessment_formats))
    end

    def labels_for(field)
      Array(lesson_plan.public_send(field)).map do |value|
        I18n.t("reports.lesson_plan.#{field}_values.#{value}", default: value)
      end.join(", ")
    end

    def section(pdf, label, text)
      return if text.blank?

      pdf.text label, size: 10, style: :bold
      pdf.move_down 4
      pdf.text text.to_s, size: 10, align: :justify, leading: 2
      pdf.move_down 14
    end
  end
end
