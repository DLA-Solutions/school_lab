# frozen_string_literal: true

require "prawn"

module Minutes
  # Renders an ata to PDF (BR-LA06): school header, book name and year, kind, title, date, the
  # sanitized body, the participant list and one signature line per signer.
  #
  # Rendered in-process with Prawn, like the contract PDF (`Contracts::RenderContractPdfService`),
  # so no headless browser is needed. The signature positions come back with the bytes, read off
  # the layout as it is drawn, so the provider places each signature on that signer's line.
  #
  # The document is a Brazilian legal record and stays in Portuguese whatever the interface
  # language is, so its labels live here rather than in the locale files.
  class RenderPdfService < ApplicationService
    MARGIN = 56
    SIGNATURE_BLOCK_HEIGHT = 70

    KIND_LABELS = {
      "meeting" => "Ata de reunião",
      "class_council" => "Ata de Conselho de Classe",
      "final_results" => "Ata de resultados finais"
    }.freeze

    HEADING_SIZES = { "h1" => 15, "h2" => 13, "h3" => 12, "h4" => 11 }.freeze

    def initialize(entry:)
      @entry = entry
    end

    def call
      positions = {}
      pdf = render(positions)

      ResponseService.success(data: { pdf: pdf, filename: filename, signature_positions: positions })
    rescue Prawn::Errors::IncompatibleStringEncoding => e
      # Prawn's built-in fonts are Windows-1252: Portuguese is covered in full, other alphabets
      # are not. Refuse clearly rather than mangle a legal name or text.
      Rails.logger.error(
        { event: "minutes.pdf_encoding_unsupported", minutes_entry_id: entry.id, message: e.message }.to_json
      )

      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.minutes_pdf_unsupported_characters") ] }
      )
    end

    private

    attr_reader :entry

    def filename
      "ata-#{entry.id}-#{entry.title.to_s.parameterize.presence || 'ata'}.pdf"
    end

    def render(positions)
      # Portuguese sits inside the built-in fonts' Windows-1252 range, so the warning about full
      # UTF-8 support does not apply to what this document contains.
      Prawn::Fonts::AFM.hide_m17n_warning = true

      Prawn::Document.new(page_size: "A4", margin: MARGIN) do |pdf|
        header(pdf)
        body(pdf)
        participants(pdf)
        signature_block(pdf, positions)
      end.render
    end

    def header(pdf)
      pdf.text entry.school.name.to_s, size: 12, style: :bold, align: :center
      pdf.move_down 4
      pdf.text "#{entry.minutes_book.name} — #{entry.minutes_book.year}", size: 10, align: :center
      pdf.move_down 16
      pdf.text KIND_LABELS.fetch(entry.kind, entry.kind).upcase, size: 14, style: :bold, align: :center
      pdf.move_down 6
      pdf.text entry.title.to_s, size: 12, align: :center
      pdf.move_down 4
      pdf.text "Data: #{entry.held_on.strftime('%d/%m/%Y')}", size: 10, align: :center
      pdf.text "Turma: #{entry.school_class.name}", size: 10, align: :center if entry.school_class
      pdf.move_down 18
    end

    # The body is already reduced to the sanitizer's allowlist; here it is walked once and drawn.
    def body(pdf)
      return if entry.body.blank?

      Nokogiri::HTML5.fragment(entry.body).children.each { |node| block(pdf, node) }
      pdf.move_down 10
    end

    def block(pdf, node)
      case node.name
      when "h1", "h2", "h3", "h4"
        pdf.move_down 6
        pdf.text inline(node), size: HEADING_SIZES.fetch(node.name), style: :bold, inline_format: true
        pdf.move_down 4
      when "ul", "ol"
        list(pdf, node)
      when "br"
        pdf.move_down 8
      else
        paragraph(pdf, node)
      end
    end

    def paragraph(pdf, node)
      text = inline(node)
      return if text.strip.empty?

      pdf.text text, size: 10, align: :justify, leading: 2, inline_format: true
      pdf.move_down 6
    end

    def list(pdf, node)
      node.element_children.select { |child| child.name == "li" }.each_with_index do |item, index|
        marker = node.name == "ol" ? "#{index + 1}." : "•"
        pdf.indent(14) do
          pdf.text "#{marker} #{inline(item)}", size: 10, leading: 2, inline_format: true
        end
      end
      pdf.move_down 6
    end

    # Prawn's inline format understands <b> and <i>; everything else is plain, escaped text.
    def inline(node)
      return escape(node.text) if node.text?

      content = node.children.map { |child| inline(child) }.join

      case node.name
      when "strong" then "<b>#{content}</b>"
      when "em" then "<i>#{content}</i>"
      when "br" then "\n"
      else content
      end
    end

    def escape(text)
      text.gsub("&", "&amp;").gsub("<", "&lt;").gsub(">", "&gt;")
    end

    def participants(pdf)
      list = entry.minutes_participants.order(:id)
      return if list.empty?

      pdf.text "Participantes", size: 11, style: :bold
      pdf.move_down 4
      list.each do |participant|
        pdf.text [ participant.name, participant.role_label ].compact_blank.join(" — "), size: 9
      end
      pdf.move_down 14
    end

    def signature_block(pdf, positions)
      signers = entry.minutes_participants.where(signs: true).order(:id)
      return if signers.empty?

      pdf.text "Assinaturas", size: 11, style: :bold
      pdf.text "Esta ata é assinada eletronicamente pelos participantes abaixo.", size: 9
      pdf.move_down 20

      signers.each do |signer|
        pdf.start_new_page if pdf.cursor < SIGNATURE_BLOCK_HEIGHT

        # Recorded before the rule is drawn: the signature image sits just above the line, which is
        # where a person signs on paper.
        positions[signer.id] = position_at(pdf)

        pdf.text "_" * 52, size: 10
        pdf.text signature_caption(signer), size: 9
        pdf.move_down 20
      end
    end

    def signature_caption(signer)
      [ signer.name, ("CPF #{Cpf.format(signer.cpf)}" if signer.cpf.present?) ].compact.join(" — ")
    end

    # Autentique places elements by percentage of the page, measured from the top-left corner, with
    # `z` as the page number. Prawn measures its cursor from the bottom of the drawable area, so the
    # two are reconciled here.
    def position_at(pdf)
      page_height = pdf.bounds.height + (MARGIN * 2)
      page_width = pdf.bounds.width + (MARGIN * 2)
      distance_from_top = MARGIN + (pdf.bounds.height - pdf.cursor)

      {
        x: ((MARGIN.to_f / page_width) * 100).round(2),
        y: ((distance_from_top.to_f / page_height) * 100).round(2),
        z: pdf.page_number
      }
    end
  end
end
