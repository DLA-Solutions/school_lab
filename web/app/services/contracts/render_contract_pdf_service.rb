# frozen_string_literal: true

require "prawn"
require "prawn/table"

module Contracts
  # Builds the agreement that goes out for signature, filled from the contract itself: the tuition
  # and the guardians who are party to it — both, or the single one on file.
  #
  # Rendered in-process with Prawn so the image needs no headless browser to produce a one-page
  # agreement, and so the bytes are deterministic enough to assert in a spec.
  class RenderContractPdfService < ApplicationService
    MARGIN = 56

    def initialize(contract:)
      @contract = contract
    end

    def call
      guardians = contract.signers

      if guardians.empty?
        return ResponseService.failure(
          code: :validation_error,
          details: { base: [ I18n.t("api.errors.contract_without_guardians") ] }
        )
      end

      # The positions come back with the bytes: they are read off the layout as it is drawn, so a
      # change to the template moves the signature fields with it instead of leaving the provider
      # pointing at blank paper.
      positions = {}
      pdf = render(guardians, positions)

      ResponseService.success(
        data: { pdf: pdf, filename: filename, signature_positions: positions }
      )
    rescue Prawn::Errors::IncompatibleStringEncoding => e
      # Prawn's built-in fonts are Windows-1252, which covers Portuguese in full but not every
      # alphabet. A name outside it must surface as a clear refusal, not a 500 — and the fix is to
      # embed a Unicode font, not to mangle somebody's legal name.
      Rails.logger.error(
        { event: "contract.pdf_encoding_unsupported", contract_id: contract.id,
          message: e.message }.to_json
      )

      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.contract_pdf_unsupported_characters") ] }
      )
    end

    private

    attr_reader :contract

    def filename
      "contrato-#{contract.id}-#{contract.student.name.parameterize}.pdf"
    end

    def render(guardians, positions)
      # Portuguese sits inside the built-in fonts' Windows-1252 range, so the warning about
      # full UTF-8 support does not apply to what this document contains.
      Prawn::Fonts::AFM.hide_m17n_warning = true

      Prawn::Document.new(page_size: "A4", margin: MARGIN) do |pdf|
        heading(pdf)
        parties(pdf, guardians)
        terms(pdf, guardians)
        signature_block(pdf, guardians, positions)
      end.render
    end

    def heading(pdf)
      pdf.text "CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS", size: 14, style: :bold, align: :center
      pdf.move_down 6
      pdf.text contract.school.name.to_s, size: 11, align: :center
      pdf.move_down 20
    end

    def parties(pdf, guardians)
      pdf.text "1. Partes", size: 12, style: :bold
      pdf.move_down 6

      rows = [ [ "Contratada", contract.school.name.to_s ] ]

      # One row per guardian, labelled by the relationship on file — so a contract with a single
      # responsible adult reads as such rather than leaving an empty second party.
      guardians.each do |guardian|
        rows << [ contractor_label(guardian), guardian_description(guardian) ]
      end

      rows << [ "Aluno(a)", student_description ]

      pdf.table(rows, width: pdf.bounds.width, cell_style: { size: 9, borders: %i[bottom] }) do
        column(0).font_style = :bold
        column(0).width = 110
      end

      pdf.move_down 18
    end

    RELATIONSHIP_LABELS = {
      "father" => "Contratante (pai)",
      "mother" => "Contratante (mãe)",
      "other" => "Contratante (responsável)"
    }.freeze

    def contractor_label(guardian)
      link = contract.student.student_guardians.kept.find_by(guardian_id: guardian.id)

      RELATIONSHIP_LABELS.fetch(link&.relationship, "Contratante (responsável)")
    end

    def guardian_description(guardian)
      [
        guardian.name,
        "CPF #{Cpf.format(guardian.cpf)}",
        guardian.email,
        guardian.phone,
        address_line(guardian)
      ].compact_blank.join(" — ")
    end

    def address_line(guardian)
      return if guardian.street.blank?

      street = [ guardian.street, guardian.number, guardian.complement ].compact_blank.join(", ")
      city = [ guardian.city, guardian.state ].compact_blank.join("/")

      [ street, guardian.neighborhood, city, formatted_zip(guardian.zip_code) ].compact_blank.join(" - ")
    end

    def formatted_zip(zip_code)
      return if zip_code.blank?

      "CEP #{zip_code.to_s.sub(/\A(\d{5})(\d{3})\z/, '\1-\2')}"
    end

    def student_description
      student = contract.student
      grade = student.school_class

      [
        student.name,
        ("CPF #{Cpf.format(student.cpf)}" if student.cpf.present?),
        ("Turma #{grade.name} — #{grade.year}" if grade)
      ].compact_blank.join(" — ")
    end

    def terms(pdf, guardians)
      pdf.text "2. Objeto e valor", size: 12, style: :bold
      pdf.move_down 6

      pdf.text objeto_paragraph(guardians), size: 10, align: :justify, leading: 2
      pdf.move_down 18
    end

    def objeto_paragraph(guardians)
      parties = to_portuguese_sentence(guardians.map(&:name))
      responsibility = guardians.length > 1 ? "responsabilizam-se" : "responsabiliza-se"

      "A CONTRATADA prestará serviços educacionais ao(à) aluno(a) #{contract.student.name} " \
        "#{enrolment_clause}. #{parties} #{responsibility} solidariamente pelo pagamento da " \
        "mensalidade de #{formatted_amount}#{due_day_clause}#{start_clause}."
    end

    def enrolment_clause
      school_class = contract.student.school_class
      return "" if school_class.blank?

      ", matriculado(a) na turma #{school_class.name} do ano letivo de #{school_class.year}"
    end

    def formatted_amount
      # Same figure `Billing::ContractTuitionAmounts` charges by — net of the plan discount (e.g.
      # a sibling band) when the contract carries one, so this fallback PDF never quotes a
      # different tuition than the boleto it is billed on.
      cents = Billing::ContractTuitionAmounts.for(contract).total_amount_cents

      # Written both ways, as a contract normally states an amount.
      "#{humanized_currency(cents)} (#{cents / 100} reais e #{cents % 100} centavos)"
    end

    def humanized_currency(cents)
      formatted = ActiveSupport::NumberHelper.number_to_currency(
        cents / 100.0, unit: "R$", separator: ",", delimiter: "."
      )

      formatted.to_s
    end

    def due_day_clause
      return "" if contract.due_day.blank?

      ", com vencimento todo dia #{contract.due_day}"
    end

    def start_clause
      return "" if contract.starts_on.blank?

      ", a partir de #{contract.starts_on.strftime('%d/%m/%Y')}"
    end

    # The agreement is a Brazilian legal document and stays in Portuguese whatever language the
    # interface is in — so it joins names itself rather than through `I18n`, which now carries a
    # single locale and would say "and" in the middle of a Portuguese sentence.
    def to_portuguese_sentence(names)
      return names.first.to_s if names.size <= 1

      "#{names[0..-2].join(', ')} e #{names.last}"
    end

    def signature_block(pdf, guardians, positions)
      pdf.text "3. Assinaturas", size: 12, style: :bold
      pdf.move_down 6
      pdf.text "Este contrato é assinado eletronicamente pelas partes abaixo.", size: 9
      pdf.move_down 24

      guardians.each do |guardian|
        # Recorded before the rule is drawn: the signature image sits just above the line, which
        # is where a person signs on paper.
        positions[guardian.id] = position_at(pdf)

        pdf.text "_" * 52, size: 10
        pdf.text "#{guardian.name} — CPF #{Cpf.format(guardian.cpf)}", size: 9
        pdf.move_down 20
      end
    end

    # Autentique places elements by percentage of the page, measured from the top-left corner,
    # with `z` as the page number. Prawn measures its cursor from the bottom of the drawable
    # area, so the two have to be reconciled here rather than by eye.
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
