# frozen_string_literal: true

module OpensslCertificateHelper
  module_function

  def generate_certificate_pair(not_after: 10.days.from_now)
    key = OpenSSL::PKey::RSA.generate(2048)
    cert = build_certificate(key:, not_after:)

    {
      certificate_pem: cert.to_pem,
      private_key_pem: key.to_pem,
      certificate: cert,
      key: key
    }
  end

  def expired_certificate_pair
    generate_certificate_pair(not_after: 1.day.ago)
  end

  def mismatched_key_pair
    pair = generate_certificate_pair
    other_key = OpenSSL::PKey::RSA.generate(2048)
    pair.merge(private_key_pem: other_key.to_pem)
  end

  def build_certificate(key:, not_after:)
    cert = OpenSSL::X509::Certificate.new
    cert.version = 2
    cert.serial = Random.rand(1_000_000)
    cert.subject = OpenSSL::X509::Name.parse("/CN=School Lab Test")
    cert.issuer = cert.subject
    cert.not_before = Time.current
    cert.not_after = not_after
    cert.public_key = key.public_key
    cert.sign(key, OpenSSL::Digest.new("SHA256"))
    cert
  end
end
