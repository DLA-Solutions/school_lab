# frozen_string_literal: true

module Contracts
  # Turns the school's HTML agreement into the document that goes out: variables replaced by the
  # contract's own data, and the logo embedded so the file carries it wherever it is opened.
  #
  # Autentique has no template or merge facility — their documentation says to substitute the
  # values yourself and upload the finished file, which is what this does.
  class FillTemplateService < ApplicationService
    # Matches `{{ aluno.nome }}` with or without the spaces.
    TOKEN = /\{\{\s*([a-z0-9_.]+)\s*\}\}/i

    RELATIONSHIP_LABELS = {
      "father" => "Pai",
      "mother" => "Mãe",
      "other" => "Responsável"
    }.freeze

    def initialize(contract:, template: nil, guardians: nil)
      @contract = contract
      @template = template
      @guardians = guardians
    end

    def call
      resolved_template = template || contract.school.contract_template
      return missing_template if resolved_template.blank?

      people = guardians || contract.signers
      return no_guardians if people.empty?

      values = substitutions(people)
      body = resolved_template.body_html.gsub(TOKEN) { values.fetch(Regexp.last_match(1).downcase, "") }

      ResponseService.success(
        data: {
          html: document(body, resolved_template),
          filename: filename,
          signature_position: resolved_template.signature_position
        }
      )
    end

    private

    attr_reader :contract, :template, :guardians

    def missing_template
      ResponseService.failure(
        code: :validation_error,
        details: { base: [I18n.t("api.errors.contract_template_missing")] }
      )
    end

    def no_guardians
      ResponseService.failure(
        code: :validation_error,
        details: { base: [I18n.t("api.errors.contract_without_guardians")] }
      )
    end

    def filename
      "contrato-#{contract.id}-#{contract.student.name.parameterize}.html"
    end

    def substitutions(people)
      school = contract.school
      student = contract.student

      {
        "escola.nome" => escape(school.name),
        "escola.cnpj" => escape(school.cnpj),
        "escola.endereco" => escape(school.address),
        "aluno.nome" => escape(student.name),
        "aluno.cpf" => escape(Cpf.format(student.cpf)),
        "aluno.rg" => escape(student.rg),
        "aluno.nascimento" => escape(format_date(student.birth_date)),
        "aluno.turma" => escape(cohort_label(student)),
        "contrato.valor" => escape(formatted_amount),
        "contrato.vencimento" => escape(contract.due_day),
        "contrato.inicio" => escape(format_date(contract.starts_on)),
        "data.hoje" => escape(format_date(Date.current)),
        "responsaveis.nomes" => escape(people.map(&:name).to_sentence(locale: :"pt-BR")),
        # The only substitution that is markup rather than text, and it is built here rather than
        # taken from input.
        "responsaveis" => guardians_block(people)
      }
    end

    # Values come from the database, but they land inside HTML — a name containing `&` or `<`
    # would otherwise break the document or smuggle markup into it.
    def escape(value)
      return "" if value.blank?

      ERB::Util.html_escape(value.to_s)
    end

    def guardians_block(people)
      rows = people.map do |guardian|
        label = RELATIONSHIP_LABELS.fetch(relationship_of(guardian), "Responsável")

        "<p><strong>#{escape(label)}:</strong> #{escape(guardian.name)} — CPF " \
          "#{escape(Cpf.format(guardian.cpf))}#{phone_fragment(guardian)} — " \
          "#{escape(guardian.email)}#{address_fragment(guardian)}</p>"
      end

      rows.join("\n")
    end

    def phone_fragment(guardian)
      return "" if guardian.phone.blank?

      " — #{escape(guardian.phone)}"
    end

    def address_fragment(guardian)
      return "" if guardian.street.blank?

      street = [guardian.street, guardian.number, guardian.complement].compact_blank.join(", ")
      city = [guardian.city, guardian.state].compact_blank.join("/")
      line = [street, guardian.neighborhood, city].compact_blank.join(" - ")

      " — #{escape(line)}"
    end

    def relationship_of(guardian)
      contract.student.student_guardians.kept.find_by(guardian_id: guardian.id)&.relationship
    end

    def cohort_label(student)
      school_class = student.school_class
      return "" if school_class.blank?

      "#{school_class.name} — #{school_class.year}"
    end

    def formatted_amount
      cents = contract.negotiated_amount_cents || contract.billing_plan&.base_amount_cents || 0

      ActiveSupport::NumberHelper.number_to_currency(
        cents / 100.0, unit: "R$", separator: ",", delimiter: "."
      )
    end

    def format_date(date)
      return "" if date.blank?

      date.strftime("%d/%m/%Y")
    end

    # A standalone document: the logo is inlined as a data URI so the file does not depend
    # on our host being reachable from wherever it is opened or converted.
    def document(body, resolved_template)
      <<~HTML
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>#{escape(document_title)}</title>
            <style>#{stylesheet(resolved_template)}</style>
          </head>
          <body>
            <main class="contract">#{logo_tag(resolved_template)}#{body}</main>
          </body>
        </html>
      HTML
    end

    # The preview renders the same shell without a contract behind it.
    def document_title
      contract ? "Contrato #{contract.student.name}" : "Contrato"
    end

    # The logo heads the document, above the title. Constrained by height with `width: auto`, so
    # a wide banner and a square mark both keep their proportions instead of being stretched.
    def logo_tag(resolved_template)
      source = logo_data_uri(resolved_template)
      return "" if source.blank?

      "<div class=\"logo\"><img src=\"#{source}\" alt=\"#{escape(school_name)}\" /></div>"
    end

    def school_name
      contract&.school&.name || template&.school&.name
    end

    def stylesheet(_resolved_template)
      <<~CSS
        @page { size: A4; margin: 18mm; }
        body {
          font-family: Helvetica, Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #111;
          margin: 0;
        }
        .contract { padding: 18mm; }
        .logo { text-align: center; margin-bottom: 12mm; }
        .logo img { max-height: 28mm; max-width: 70%; width: auto; height: auto; }
        h1 { font-size: 16pt; text-align: center; }
        h2 { font-size: 12pt; margin-top: 18px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 4px 0; text-align: left; vertical-align: top; }
        img { max-width: 100%; }
      CSS
    end

    def logo_data_uri(resolved_template)
      return unless resolved_template.logo.attached?

      "data:#{resolved_template.logo.content_type};base64," \
        "#{Base64.strict_encode64(resolved_template.logo.download)}"
    rescue ActiveStorage::FileNotFoundError
      # A missing blob must not stop a contract going out; it just goes out unbranded.
      Rails.logger.warn(
        { event: "contract.logo_missing", school_id: resolved_template.school_id }.to_json
      )
      nil
    end
  end
end
