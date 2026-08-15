# frozen_string_literal: true

# The agreement a school sends for signature, kept as HTML so the wording is the school's to edit.
#
# The stored HTML is sanitised on write: it is rendered in the browser's preview and uploaded to
# the signature provider, so a script tag saved here would run somewhere it should not.
class ContractTemplate < ApplicationRecord
  # What the editor offers, and what `Contracts::FillTemplateService` knows how to replace. Listed
  # here so the screen can show the list without the two drifting apart.
  VARIABLES = {
    "escola.nome" => "Nome da escola",
    "escola.cnpj" => "CNPJ da escola",
    "escola.endereco" => "Endereço da escola",
    "aluno.nome" => "Nome do aluno",
    "aluno.cpf" => "CPF do aluno",
    "aluno.rg" => "RG do aluno",
    "aluno.nascimento" => "Data de nascimento do aluno",
    "aluno.turma" => "Turma e ano letivo",
    "contrato.valor" => "Mensalidade acordada com a família",
    "contrato.valor.tabela" => "Mensalidade de tabela do plano, antes de descontos",
    "contrato.pontualidade.percentual" => "Percentual do desconto pontualidade (ex.: 10%)",
    "contrato.pontualidade.dia" => "Dia limite para o desconto pontualidade",
    "contrato.pontualidade.desconto" => "Valor abatido pelo desconto pontualidade",
    "contrato.pontualidade.valor" => "Mensalidade já com o desconto pontualidade",
    "contrato.vencimento" => "Dia de vencimento",
    "contrato.inicio" => "Início da vigência",
    "responsaveis" => "Bloco com os dados de todos os responsáveis (um ou dois)",
    "responsaveis.nomes" => "Nomes dos responsáveis separados por vírgula",
    "responsaveis.assinaturas" => "Linhas de assinatura de todos os responsáveis, para o fim do contrato",
    "contrato.responsavel" => "Responsável pelos boletos",
    "contrato.responsavel.cpf" => "CPF do responsável pelos boletos",
    "data.hoje" => "Data de hoje por extenso"
  }.freeze

  # Tags a contract legitimately needs. Anything else — scripts, iframes, forms, event handlers —
  # is stripped rather than trusted, since this HTML is rendered and shipped onward.
  ALLOWED_TAGS = %w[
    h1 h2 h3 h4 p br hr div span strong b em i u ol ul li table thead tbody tr th td
    img header footer section article small blockquote
  ].freeze

  ALLOWED_ATTRIBUTES = %w[class style src alt width height align colspan rowspan].freeze

  belongs_to :school
  belongs_to :updated_by, class_name: "User", optional: true

  # Shown above the title, so a contract leaves under the school's own mark.
  has_one_attached :logo

  before_validation :sanitize_body

  validates :body_html, presence: true
  validate :logo_is_an_image
  validate :copy_emails_are_addresses

  # Blank entries and duplicates come from a comma-separated field; neither is a recipient.
  before_validation :normalize_copy_emails

  # A school with no agreement of its own starts from this one rather than a blank page.
  def self.default_body_html
    <<~HTML.strip
      <h1>Contrato de Prestação de Serviços Educacionais</h1>
      <p><strong>{{escola.nome}}</strong> — CNPJ {{escola.cnpj}}</p>

      <h2>1. Partes</h2>
      {{responsaveis}}
      <p><strong>Aluno(a):</strong> {{aluno.nome}} — CPF {{aluno.cpf}} — RG {{aluno.rg}} — {{aluno.turma}}</p>

      <h2>2. Objeto e valor</h2>
      <p>
        A CONTRATADA prestará serviços educacionais ao(à) aluno(a) {{aluno.nome}}, matriculado(a) em
        {{aluno.turma}}. {{responsaveis.nomes}} responsabiliza(m)-se pelo pagamento da mensalidade de
        {{contrato.valor}}, com vencimento todo dia {{contrato.vencimento}}, a partir de {{contrato.inicio}}.
      </p>

      <h2>3. Responsável financeiro</h2>
      <p>
        Os boletos referentes a este contrato serão emitidos em nome de
        <strong>{{contrato.responsavel}}</strong>, CPF {{contrato.responsavel.cpf}}, que os
        receberá e responderá pelo respectivo pagamento.
      </p>

      <h2>4. Assinaturas</h2>
      <p>Este contrato é assinado eletronicamente pelas partes, em {{data.hoje}}.</p>
      {{responsaveis.assinaturas}}
      <p class="signature">___________________________________________<br />{{escola.nome}} — CNPJ {{escola.cnpj}} (CONTRATADA)</p>
    HTML
  end

  private

  def sanitize_body
    return if body_html.blank?

    self.body_html = Rails::HTML5::SafeListSanitizer.new.sanitize(
      body_html, tags: ALLOWED_TAGS, attributes: ALLOWED_ATTRIBUTES
    ).to_s
  end

  # Loose on purpose: this is a hint that someone mistyped, not an attempt to decide what the
  # RFC allows. A wrong-but-plausible address is caught by the mail never arriving, not here.
  EMAIL_FORMAT = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/

  def normalize_copy_emails
    self.copy_emails = Array(copy_emails).map { |email| email.to_s.strip.downcase }
                                         .reject(&:blank?)
                                         .uniq
  end

  def copy_emails_are_addresses
    return if copy_emails.blank?

    errors.add(:copy_emails, :invalid) unless copy_emails.all? { |email| email.match?(EMAIL_FORMAT) }
  end

  def logo_is_an_image
    return unless logo.attached?

    errors.add(:logo, :invalid) unless logo.content_type.to_s.start_with?("image/")

    # Embedded as a data URI in every contract, so an oversized file would bloat each one.
    errors.add(:logo, :too_big) if logo.byte_size > 2.megabytes
  end
end
