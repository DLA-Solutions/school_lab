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
          filename: filename
        }
      )
    end

    private

    attr_reader :contract, :template, :guardians

    def missing_template
      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.contract_template_missing") ] }
      )
    end

    def no_guardians
      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.contract_without_guardians") ] }
      )
    end

    # A draft has no id yet — it is rendered from a form that was never saved — so the student's
    # name carries the file on its own until there is a contract to number it by.
    def filename
      [ "contrato", contract.id, contract.student.name.parameterize ].compact_blank.join("-") + ".html"
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
        # The table price the school publishes, before anything agreed for this family. The
        # punctuality figures are all measured against it.
        "contrato.valor.tabela" => escape(money(table_amount_cents)),
        "contrato.pontualidade.percentual" => escape(punctuality_percent_label),
        "contrato.pontualidade.dia" => escape(punctuality_day),
        "contrato.pontualidade.desconto" => escape(money(punctuality_discount_cents)),
        "contrato.pontualidade.valor" => escape(money(punctuality_amount_cents)),
        "contrato.vencimento" => escape(contract.due_day),
        "contrato.inicio" => escape(format_date(contract.starts_on)),
        "data.hoje" => escape(format_date(Date.current)),
        "contrato.responsavel" => escape(contract.payer&.name),
        "contrato.responsavel.cpf" => escape(Cpf.format(contract.payer&.cpf)),
        "responsaveis.nomes" => escape(portuguese_sentence(people.map(&:name))),
        # The only substitutions that are markup rather than text, and both are built here rather
        # than taken from input.
        "responsaveis" => guardians_block(people),
        "responsaveis.assinaturas" => signature_block(people)
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

    # One signing line per contracting party, at the foot of the agreement. The provider places
    # its own seal wherever it converts the file, but the document still has to say on its face
    # who is bound by it — with both parents named when both are on file, not just whoever pays.
    def signature_block(people)
      lines = people.map do |guardian|
        label = RELATIONSHIP_LABELS.fetch(relationship_of(guardian), "Responsável")

        "<p class=\"signature\">___________________________________________<br />" \
          "#{escape(guardian.name)} — CPF #{escape(Cpf.format(guardian.cpf))} " \
          "(#{escape(label)})</p>"
      end

      lines.join("\n")
    end

    def phone_fragment(guardian)
      return "" if guardian.phone.blank?

      " — #{escape(guardian.phone)}"
    end

    def address_fragment(guardian)
      return "" if guardian.street.blank?

      street = [ guardian.street, guardian.number, guardian.complement ].compact_blank.join(", ")
      city = [ guardian.city, guardian.state ].compact_blank.join("/")
      line = [ street, guardian.neighborhood, city ].compact_blank.join(" - ")

      " — #{escape(line)}"
    end

    def relationship_of(guardian)
      contract.student.student_guardians.kept.find_by(guardian_id: guardian.id)&.relationship
    end

    # The whole cohort, not just its letter: "A — 2026" named no grade and no shift, which in a
    # contract is the difference between identifying the class and not.
    def cohort_label(student)
      student.school_class&.full_name.to_s
    end

    # What this family agreed to pay, which is the table price unless something else was negotiated.
    def formatted_amount
      money(contract.negotiated_amount_cents || table_amount_cents)
    end

    # The school's published price for the plan, before anything agreed for this family.
    def table_amount_cents
      contract.billing_plan&.base_amount_cents || 0
    end

    def billing_settings
      @billing_settings ||= contract.school.school_billing_settings
    end

    def punctuality_percent
      billing_settings&.early_payment_discount_percent
    end

    # "10%" rather than "10.0%": the percentage is stored with two decimals, and a contract reads
    # the round number as a round number.
    def punctuality_percent_label
      return "" if punctuality_percent.blank?

      formatted = punctuality_percent.to_d.frac.zero? ? punctuality_percent.to_i : punctuality_percent
      "#{formatted}%".tr(".", ",")
    end

    def punctuality_day
      billing_settings&.early_payment_discount_day
    end

    # Rounded to the cent the family actually pays, so the two figures in the contract add up.
    def punctuality_discount_cents
      return 0 if punctuality_percent.blank?

      (table_amount_cents * punctuality_percent.to_d / 100).round
    end

    def punctuality_amount_cents
      table_amount_cents - punctuality_discount_cents
    end

    def money(cents)
      # `%u %n` rather than the default `%u%n`: "R$ 1.249,15" is how the amount is written in a
      # Brazilian contract, and "R$1.249,15" reads as a typo in a document a family signs.
      ActiveSupport::NumberHelper.number_to_currency(
        cents.to_i / 100.0, unit: "R$", separator: ",", delimiter: ".", format: "%u %n"
      )
    end

    # The agreement is a Brazilian legal document and stays in Portuguese whatever language the
    # interface is in, so it joins names itself rather than through `I18n`.
    def portuguese_sentence(names)
      return names.first.to_s if names.size <= 1

      "#{names[0..-2].join(', ')} e #{names.last}"
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
        .signature { margin-top: 16mm; line-height: 1.8; }
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
