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
        # The table price the school publishes, before anything agreed for this family. Punctuality
        # is never measured against this directly — see `other_discount_given?` for what it runs
        # against instead once the family has a plan or negotiated discount.
        "contrato.valor.tabela" => escape(money(table_amount_cents)),
        # The other band this contract carries, e.g. a sibling rate — "Desconto irmãos (2º filho)"
        # at 5%, or "Desconto irmãos (3º filho ou mais)" at 10%, capped there for a 4th and beyond.
        # Blank when the contract carries none, which the sentence around it is written to survive.
        "contrato.desconto.nome" => escape(plan_discount&.name),
        "contrato.desconto.percentual" => escape(plan_discount_percent_label),
        "contrato.desconto.valor" => escape(money(plan_discount_amount_cents)),
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

    # What this family agreed to pay: the table price, less the plan discount (e.g. a sibling
    # band) when the contract carries one, and further widened back out to what a late family
    # owes when that other discount is the reason the reference figure is discounted at all. Same
    # figure `Billing::ContractTuitionAmounts` charges by (before that widening), so the contract
    # and the boleto never disagree about what "the tuition" is.
    def formatted_amount
      money(full_amount_cents)
    end

    # The school's published price for the plan, before anything agreed for this family.
    def table_amount_cents
      contract.billing_plan&.base_amount_cents || 0
    end

    def tuition_amounts
      @tuition_amounts ||= Billing::ContractTuitionAmounts.for(contract)
    end

    def plan_discount
      contract.plan_discount
    end

    def plan_discount_percent_label
      percent_label(plan_discount&.percent)
    end

    def plan_discount_amount_cents
      return 0 unless tuition_amounts.plan_discount_applied

      tuition_amounts.discount_amount_cents
    end

    def billing_settings
      @billing_settings ||= contract.school.school_billing_settings
    end

    def punctuality_percent
      billing_settings&.early_payment_discount_percent
    end

    def punctuality_percent_label
      percent_label(punctuality_percent)
    end

    # "10%" rather than "10.0%": the percentage is stored with two decimals, and a contract reads
    # the round number as a round number.
    def percent_label(percent)
      return "" if percent.blank?

      formatted = percent.to_d.frac.zero? ? percent.to_i : percent
      "#{formatted}%".tr(".", ",")
    end

    def punctuality_day
      billing_settings&.early_payment_discount_day
    end

    # `total_amount_cents` already resolves to the one figure that matters here: the plan discount
    # result, the negotiated amount, or (absent both) the table price.
    def punctuality_reference_cents
      tuition_amounts.total_amount_cents
    end

    # Whether this family has a discount other than punctuality — a sibling band or a manually
    # negotiated amount. It decides which way the single punctuality rule runs: with nothing else
    # negotiated, the plan's own price is what is owed, and paying by the day earns 10% off it.
    # With something else already negotiated, that figure IS the reward for paying on time — the
    # 10% is what a late family pays on top of it, not what an on-time family saves from it.
    def other_discount_given?
      tuition_amounts.plan_discount_applied || contract.negotiated_amount_cents.present?
    end

    def punctuality_discount_cents
      return 0 if punctuality_percent.blank?

      (punctuality_reference_cents * punctuality_percent.to_d / 100).round
    end

    # What is owed in full — the negotiated/plan figure itself when there is no other discount to
    # react to, or that figure plus the punctuality discount when there is, since it was already
    # the discounted (on-time) price.
    def full_amount_cents
      return punctuality_reference_cents unless other_discount_given? && punctuality_percent.present?

      punctuality_reference_cents + punctuality_discount_cents
    end

    # What an on-time family pays — the negotiated/plan figure minus the punctuality discount when
    # there is nothing else negotiated, or that figure as-is when there is, since it already is
    # the on-time price.
    def punctuality_amount_cents
      return punctuality_reference_cents if other_discount_given?

      punctuality_reference_cents - punctuality_discount_cents
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
          /* Hyphenation needs the language declared, and the document is Brazilian Portuguese. */
          -webkit-hyphens: auto;
          hyphens: auto;
          font-size: 11pt;
          line-height: 1.5;
          color: #111;
          margin: 0;
        }
        .contract { padding: 18mm; }
        /* A contract is set justified — it is what the document looks like on paper, and what
           the family sees once Autentique converts the file. Hyphenation comes with it: the usual
           reason to avoid justification is the rivers of white space it opens in a narrow column,
           and letting words break is what closes them. The document declares `lang="pt-BR"`, which
           is what `hyphens: auto` needs to break Portuguese correctly. */
        .contract p,
        .contract li {
          text-align: justify;
          text-justify: inter-word;
          hyphens: auto;
        }
        .logo { text-align: center; margin-bottom: 12mm; }
        .logo img { max-height: 28mm; max-width: 70%; width: auto; height: auto; }
        /* Headings and the signature lines are the exceptions: centring and the ruled lines are
           what makes them read as headings and as places to sign. */
        h1 { font-size: 16pt; text-align: center; }
        h2 { font-size: 12pt; margin-top: 18px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 4px 0; text-align: left; vertical-align: top; }
        img { max-width: 100%; }
        .signature { margin-top: 16mm; line-height: 1.8; text-align: left; }
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
