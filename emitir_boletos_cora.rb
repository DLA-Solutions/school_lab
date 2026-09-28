#!/usr/bin/env ruby
# frozen_string_literal: true

# Script standalone (sem depender da aplicação Rails) para emitir boletos na Cora a partir de
# cora_boletos.csv. Usa só a stdlib do Ruby: net/http, openssl, json, csv, date.
#
# Uso:
#   ruby emitir_boletos_cora.rb
#
# Arquivos esperados na mesma pasta deste script:
#   - cora_boletos.csv   (colunas: pagador, cpf, phone, dia_vencimento, valor_total_reais)
#   - certificate.pem
#   - private-key.key
#
# Cada linha do CSV vira um Boleto (Struct) antes de montar o payload — nada é lido do banco do
# school_lab, e nada é gravado nele: a única saída, além do que a Cora responde, é o CSV de
# resultado gravado ao lado do script.

require "net/http"
require "openssl"
require "json"
require "csv"
require "date"
require "securerandom"
require "digest"

DIR = File.expand_path(__dir__)
CSV_PATH = File.join(DIR, "cora_boletos.csv")
CERT_PATH = File.join(DIR, "certificate.pem")
KEY_PATH = File.join(DIR, "private-key.key")

# Outubro de 2026: os "dia_vencimento" do CSV (4, 5, 10...) são só o dia; o mês/ano não vem na
# planilha reduzida, então fica fixo aqui — mudar isto ao reaproveitar o script para outro mês.
BILLING_YEAR = 2026
BILLING_MONTH = 10

API_BASE_URL = "https://matls-clients.api.cora.com.br"

# Condições comerciais da escola (não vêm do CSV nem do banco: hardcoded aqui de propósito, já
# que o script não consulta a aplicação). Ajustar se a escola mudar essas regras.
#
# Desconto pontualidade OMITIDO de propósito: a regra ainda não está vigente para esta remessa.
INTEREST_RATE_PERCENT = 1.0
FINE_RATE_PERCENT = 2.0
SERVICE_DESCRIPTION = "Mensalidade escolar"

Boleto = Struct.new(:pagador, :cpf, :phone, :dia_vencimento, :valor_reais, keyword_init: true) do
  def valor_centavos
    (valor_reais.to_f * 100).round
  end

  def due_date
    Date.new(BILLING_YEAR, BILLING_MONTH, dia_vencimento.to_i)
  end

  def cpf_digits
    cpf.to_s.gsub(/\D/, "")
  end

  def phone_e164
    digits = phone.to_s.gsub(/\D/, "")
    return nil if digits.empty?

    if digits.start_with?("55") && [ 12, 13 ].include?(digits.length)
      "+#{digits}"
    elsif [ 10, 11 ].include?(digits.length)
      "+55#{digits}"
    end
  end

  def code
    "csv-#{cpf_digits}-#{BILLING_YEAR}#{format('%02d', BILLING_MONTH)}"
  end

  # A Cora exige que o header Idempotency-Key seja um UUID válido — não aceita uma string
  # qualquer. Gerado de forma determinística (hash de cpf+vencimento) em vez de aleatório, para
  # que rodar o script de novo reenvie a mesma chave para quem já foi emitido, e não duplique.
  #
  # IDEMPOTENCY_SALT muda a chave inteira: usado para forçar uma nova emissão quando as regras
  # comerciais mudam (ex.: removido o desconto pontualidade) e a chave anterior já está associada,
  # na Cora, a um boleto cancelado — sem o salt, reemitir cairia na mesma chave do boleto antigo.
  IDEMPOTENCY_SALT = "v2-sem-desconto-pontualidade"

  def idempotency_key
    digest = Digest::SHA1.hexdigest("cora-csv-#{IDEMPOTENCY_SALT}-#{cpf_digits}-#{due_date.iso8601}")
    "#{digest[0, 8]}-#{digest[8, 4]}-#{digest[12, 4]}-#{digest[16, 4]}-#{digest[20, 12]}"
  end
end

def load_boletos(path)
  CSV.read(path, headers: true).map do |row|
    Boleto.new(
      pagador: row["pagador"],
      cpf: row["cpf"],
      phone: row["phone"],
      dia_vencimento: row["dia_vencimento"],
      valor_reais: row["valor_total_reais"]
    )
  end
end

def build_payload(boleto)
  channels = []
  channels << { channel: "SMS", contact: boleto.phone_e164, rules: %w[NOTIFY_TWO_DAYS_BEFORE_DUE_DATE NOTIFY_ON_DUE_DATE] } if boleto.phone_e164

  payload = {
    code: boleto.code,
    customer: {
      name: boleto.pagador,
      document: { identity: boleto.cpf_digits, type: "CPF" }
    },
    services: [
      { name: SERVICE_DESCRIPTION, description: SERVICE_DESCRIPTION, amount: boleto.valor_centavos }
    ],
    payment_terms: {
      due_date: boleto.due_date.iso8601,
      interest: { rate: INTEREST_RATE_PERCENT },
      fine: { rate: FINE_RATE_PERCENT }
    },
    payment_forms: %w[BANK_SLIP PIX]
  }
  payload[:notification] = { name: boleto.pagador, channels: channels } unless channels.empty?
  payload
end

def client_id_from_certificate(cert)
  cn = cert.subject.to_a.find { |name, _, _| name == "CN" }
  raise "Certificado sem CN — não foi possível derivar o client_id" unless cn

  cn[1]
end

def build_http
  http = Net::HTTP.new(URI(API_BASE_URL).host, 443)
  http.use_ssl = true
  http.cert = OpenSSL::X509::Certificate.new(File.read(CERT_PATH))
  http.key = OpenSSL::PKey::RSA.new(File.read(KEY_PATH))
  http.open_timeout = 10
  http.read_timeout = 30
  http
end

def fetch_token(http, client_id)
  request = Net::HTTP::Post.new("/token")
  request["Content-Type"] = "application/x-www-form-urlencoded"
  request.body = URI.encode_www_form(grant_type: "client_credentials", client_id: client_id)

  response = http.request(request)
  raise "Falha ao obter token (#{response.code}): #{response.body}" unless response.code == "200"

  JSON.parse(response.body).fetch("access_token")
end

def issue_invoice(http, token, boleto)
  request = Net::HTTP::Post.new("/v2/invoices/")
  request["Content-Type"] = "application/json"
  request["Authorization"] = "Bearer #{token}"
  request["Idempotency-Key"] = boleto.idempotency_key
  request.body = build_payload(boleto).to_json

  response = http.request(request)
  [ response.code, response.body ]
end

def list_invoices(http, token, since:, per_page: 100)
  request = Net::HTTP::Get.new("/v2/invoices/?start=#{since.iso8601}&perPage=#{per_page}")
  request["Authorization"] = "Bearer #{token}"

  response = http.request(request)
  raise "Falha ao listar faturas (#{response.code}): #{response.body}" unless response.code.to_i.between?(200, 299)

  JSON.parse(response.body).fetch("items", [])
end

def cancel_invoice(http, token, invoice_id)
  request = Net::HTTP::Delete.new("/v2/invoices/#{invoice_id}")
  request["Authorization"] = "Bearer #{token}"

  response = http.request(request)
  [ response.code, response.body ]
end

def main
  [ CSV_PATH, CERT_PATH, KEY_PATH ].each do |path|
    abort "Arquivo ausente: #{path}" unless File.exist?(path)
  end

  cert = OpenSSL::X509::Certificate.new(File.read(CERT_PATH))
  abort "Certificado expirado em #{cert.not_after}" if cert.not_after <= Time.now

  client_id = client_id_from_certificate(cert)
  http = build_http
  token = fetch_token(http, client_id)

  boletos = load_boletos(CSV_PATH)
  results_path = File.join(DIR, "resultado-#{Time.now.strftime('%Y%m%d%H%M%S')}.csv")

  issued = 0
  failed = 0

  CSV.open(results_path, "w") do |results|
    results << %w[pagador cpf status_http invoice_id boleto_url resposta]

    boletos.each do |boleto|
      code, body = issue_invoice(http, token, boleto)

      if code.to_i.between?(200, 299)
        parsed = JSON.parse(body)
        boleto_url = parsed.dig("payment_options", "bank_slip", "url") || parsed.dig("bank_slip", "url")
        invoice_id = parsed["id"]
        puts "EMITIDO #{boleto.pagador} (#{boleto.cpf_digits}) [#{invoice_id}] -> #{boleto_url}"
        results << [ boleto.pagador, boleto.cpf_digits, code, invoice_id, boleto_url, nil ]
        issued += 1
      else
        puts "ERRO    #{boleto.pagador} (#{boleto.cpf_digits}) [#{code}]: #{body}"
        results << [ boleto.pagador, boleto.cpf_digits, code, nil, nil, body ]
        failed += 1
      end
    end
  end

  puts "\nEmitidos: #{issued} | Falharam: #{failed}"
  puts "Resultado detalhado em #{results_path}"
end

main if __FILE__ == $PROGRAM_NAME
