# frozen_string_literal: true

module Contracts
  # Renders the agreement with stand-in data, for a school that has no contract to preview yet.
  # Shares `FillTemplateService`'s document shell so the preview and the real thing cannot look
  # different from each other.
  class PreviewTemplateService < ApplicationService
    SAMPLE = {
      "escola.nome" => "Escola Exemplo",
      "escola.cnpj" => "12.345.678/0001-90",
      "escola.endereco" => "Avenida Paulista, 1000 - São Paulo/SP",
      "aluno.nome" => "Pedro Silva",
      "aluno.cpf" => "529.982.247-25",
      "aluno.rg" => "MG-14.235.789",
      "aluno.nascimento" => "10/03/2015",
      "aluno.turma" => "Ensino Fundamental I — 5º ano A · Matutino — 2026",
      "contrato.valor" => "R$ 1.186,69",
      "contrato.valor.tabela" => "R$ 1.249,15",
      "contrato.desconto.nome" => "Desconto irmãos (2º filho)",
      "contrato.desconto.percentual" => "5%",
      "contrato.desconto.valor" => "R$ 62,46",
      "contrato.pontualidade.percentual" => "10%",
      "contrato.pontualidade.dia" => "5",
      "contrato.pontualidade.desconto" => "R$ 118,67",
      "contrato.pontualidade.valor" => "R$ 1.068,02",
      "contrato.vencimento" => "10",
      "contrato.inicio" => "01/02/2026",
      "responsaveis.nomes" => "Maria Silva e João Silva",
      "contrato.responsavel" => "Maria Silva",
      "contrato.responsavel.cpf" => "123.456.789-09",
      "responsaveis" =>
        "<p><strong>Mãe:</strong> Maria Silva — CPF 123.456.789-09 — maria@exemplo.com</p>\n" \
        "<p><strong>Pai:</strong> João Silva — CPF 529.982.247-25 — joao@exemplo.com</p>",
      "responsaveis.assinaturas" =>
        "<p class=\"signature\">___________________________________________<br />" \
        "Maria Silva — CPF 123.456.789-09 (Mãe)</p>\n" \
        "<p class=\"signature\">___________________________________________<br />" \
        "João Silva — CPF 529.982.247-25 (Pai)</p>"
    }.freeze

    def initialize(template:)
      @template = template
    end

    def call
      body = template.body_html.to_s.gsub(FillTemplateService::TOKEN) do
        SAMPLE.fetch(Regexp.last_match(1).downcase, "")
      end

      ResponseService.success(data: { html: wrap(body) })
    end

    private

    attr_reader :template

    # Reuses the real renderer's shell by handing it the sample body; nothing about the preview
    # markup is written twice.
    def wrap(body)
      FillTemplateService.new(contract: nil, template: template).send(:document, body, template)
    end
  end
end
