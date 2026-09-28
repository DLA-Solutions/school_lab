#!/usr/bin/env ruby
# frozen_string_literal: true

# Script standalone para emitir UM boleto avulso na Cora (produção), fora do lote mensal do
# emitir_boletos_cora.rb. Uso pontual: Lara Martins Cavalcante de Castro, rescisão contratual.

require "net/http"
require "openssl"
require "json"
require "date"
require "digest"

DIR = File.expand_path(__dir__)
CERT_PATH = File.join(DIR, "certificate.pem")
KEY_PATH = File.join(DIR, "private-key.key")

API_BASE_URL = "https://matls-clients.api.cora.com.br"

PAGADOR = "Lara Martins Cavalcante de Castro"
CPF = "70102403104"
PHONE = "62996823963"
VALOR_REAIS = 960.15
DESCRICAO = "Rescisão contratual"
DUE_DATE = Date.new(2026, 10, 9)
INTEREST_RATE_PERCENT = 1.0
FINE_RATE_PERCENT = 2.0

def cpf_digits(cpf)
  cpf.gsub(/\D/, "")
end

def phone_e164(phone)
  digits = phone.gsub(/\D/, "")
  return nil if digits.empty?

  if digits.start_with?("55") && [ 12, 13 ].include?(digits.length)
    "+#{digits}"
  elsif [ 10, 11 ].include?(digits.length)
    "+55#{digits}"
  end
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

def main
  [ CERT_PATH, KEY_PATH ].each do |path|
    abort "Arquivo ausente: #{path}" unless File.exist?(path)
  end

  cert = OpenSSL::X509::Certificate.new(File.read(CERT_PATH))
  abort "Certificado expirado em #{cert.not_after}" if cert.not_after <= Time.now

  client_id = client_id_from_certificate(cert)
  http = build_http
  token = fetch_token(http, client_id)

  valor_centavos = (VALOR_REAIS * 100).round
  code = "avulso-#{cpf_digits(CPF)}-#{DUE_DATE.strftime('%Y%m%d')}"
  idem_digest = Digest::SHA1.hexdigest("cora-avulso-#{cpf_digits(CPF)}-#{DUE_DATE.iso8601}-#{DESCRICAO}")
  idempotency_key = "#{idem_digest[0, 8]}-#{idem_digest[8, 4]}-#{idem_digest[12, 4]}-#{idem_digest[16, 4]}-#{idem_digest[20, 12]}"

  channels = []
  if phone_e164(PHONE)
    channels << { channel: "SMS", contact: phone_e164(PHONE), rules: %w[NOTIFY_TWO_DAYS_BEFORE_DUE_DATE NOTIFY_ON_DUE_DATE] }
  end

  payload = {
    code: code,
    customer: {
      name: PAGADOR,
      document: { identity: cpf_digits(CPF), type: "CPF" }
    },
    services: [
      { name: DESCRICAO, description: DESCRICAO, amount: valor_centavos }
    ],
    payment_terms: {
      due_date: DUE_DATE.iso8601,
      interest: { rate: INTEREST_RATE_PERCENT },
      fine: { rate: FINE_RATE_PERCENT }
    },
    payment_forms: %w[BANK_SLIP PIX]
  }
  payload[:notification] = { name: PAGADOR, channels: channels } unless channels.empty?

  request = Net::HTTP::Post.new("/v2/invoices/")
  request["Content-Type"] = "application/json"
  request["Authorization"] = "Bearer #{token}"
  request["Idempotency-Key"] = idempotency_key
  request.body = payload.to_json

  response = http.request(request)

  if response.code.to_i.between?(200, 299)
    parsed = JSON.parse(response.body)
    boleto_url = parsed.dig("payment_options", "bank_slip", "url") || parsed.dig("bank_slip", "url")
    puts "EMITIDO #{PAGADOR} (#{cpf_digits(CPF)}) [#{parsed['id']}] -> #{boleto_url}"
  else
    puts "ERRO [#{response.code}]: #{response.body}"
  end
end

main if __FILE__ == $PROGRAM_NAME
