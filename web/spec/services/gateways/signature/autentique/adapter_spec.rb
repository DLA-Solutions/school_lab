# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::Signature::Autentique::Adapter do
  let(:school) { create(:school) }
  let(:config) { create(:school_signature_provider, :autentique, school: school) }
  let(:adapter) { described_class.new(school: school, config: config) }
  let(:endpoint) { described_class::ENDPOINT }

  let(:request) do
    Gateways::Signature::ValueObjects::SignatureRequest.new(
      name: "Contrato Pedro Silva",
      pdf: "%PDF-1.4 fake bytes",
      filename: "contrato-1.pdf",
      message: "Assine, por favor.",
      signers: [
        Gateways::Signature::ValueObjects::Signer.new(
          name: "Maria Silva", email: "maria@example.com", cpf: "12345678909",
          positions: [ { x: 9.41, y: 78.5, z: 1 } ]
        ),
        Gateways::Signature::ValueObjects::Signer.new(
          name: "João Silva", email: "joao@example.com", cpf: "52998224725"
        )
      ]
    )
  end

  let(:created_document) do
    {
      data: {
        createDocument: {
          id: "doc-abc-123",
          name: "Contrato Pedro Silva",
          signatures: [
            { public_id: "s1", name: "Maria Silva", email: "maria@example.com",
              link: { short_link: "https://autentique.com.br/s/1" }, signed: nil },
            { public_id: "s2", name: "João Silva", email: "joao@example.com",
              link: { short_link: "https://autentique.com.br/s/2" }, signed: nil }
          ]
        }
      }
    }.to_json
  end

  # The captured body of the last request, so the multipart shape can be asserted.
  def stub_create(status: 200, body: created_document)
    captured = {}

    stub_request(:post, endpoint).to_return do |req|
      captured[:body] = req.body
      captured[:headers] = req.headers
      { status: status, body: body, headers: { "Content-Type" => "application/json" } }
    end

    captured
  end

  describe "#create_document" do
    it "sends the token as a bearer credential" do
      captured = stub_create

      adapter.create_document(request)

      expect(captured[:headers]["Authorization"]).to eq("Bearer autentique-test-token")
    end

    # Autentique follows the GraphQL multipart request spec: the query travels in `operations`,
    # `map` says where the file belongs, and the PDF is its own part.
    it "uploads the PDF as a multipart part mapped onto variables.file" do
      captured = stub_create

      adapter.create_document(request)

      expect(captured[:headers]["Content-Type"]).to start_with("multipart/form-data")
      expect(captured[:body]).to include('name="operations"')
      expect(captured[:body]).to include('name="map"')
      expect(captured[:body]).to include('{"file":["variables.file"]}')
      expect(captured[:body]).to include("filename=\"contrato-1.pdf\"")
      expect(captured[:body]).to include("%PDF-1.4 fake bytes")
    end

    it "asks for a signature from every signer, identified by CPF" do
      captured = stub_create

      adapter.create_document(request)

      operations = JSON.parse(captured[:body][/\{"query".*?\}\}\}(?=\r\n)/m] || extract_operations(captured[:body]))
      signers = operations.dig("variables", "signers")

      expect(signers.map { |s| s["email"] }).to eq([ "maria@example.com", "joao@example.com" ])
      expect(signers.map { |s| s["action"] }).to eq(%w[SIGN SIGN])
      # `configs.cpf` makes the provider demand that document from whoever opens the link.
      expect(signers.map { |s| s.dig("configs", "cpf") }).to eq(%w[12345678909 52998224725])
    end

    # The school's own copy. `cc` delivers the document and asks nothing of the recipient, while
    # every entry in `signers` must act — so a school listed there would sign its own contracts.
    it "carries the school's copies as document recipients, not as signers" do
      captured = stub_create

      adapter.create_document(
        request.with(copy_emails: [ "colegionsrgo@gmail.com", "direcao@escola.com.br" ])
      )

      operations = JSON.parse(extract_operations(captured[:body]))

      expect(operations.dig("variables", "document", "cc")).to eq(
        [ { "email" => "colegionsrgo@gmail.com" }, { "email" => "direcao@escola.com.br" } ]
      )
      expect(operations.dig("variables", "signers").map { |s| s["email"] })
        .not_to include("colegionsrgo@gmail.com")
    end

    # Autentique rejects an empty list where it expects addresses, so the key is left out.
    it "omits the copy list entirely when the school configured none" do
      captured = stub_create

      adapter.create_document(request)

      operations = JSON.parse(extract_operations(captured[:body]))

      expect(operations.dig("variables", "document")).not_to have_key("cc")
    end

    # Percentages of the page, as strings, with the page number in `z`.
    it "tells the provider where each signature belongs" do
      captured = stub_create

      adapter.create_document(request)

      signers = JSON.parse(extract_operations(captured[:body])).dig("variables", "signers")

      expect(signers.first["positions"]).to eq(
        [ { "x" => "9.41", "y" => "78.50", "z" => 1, "element" => "SIGNATURE" } ]
      )
    end

    # Without coordinates the provider falls back to its own placement, which is better than
    # sending an empty array it would have to interpret.
    it "omits positions for a signer with none" do
      captured = stub_create

      adapter.create_document(request)

      signers = JSON.parse(extract_operations(captured[:body])).dig("variables", "signers")

      expect(signers.last).not_to have_key("positions")
    end

    it "returns the provider's document id and one link per signer" do
      stub_create

      document = adapter.create_document(request)

      expect(document.provider_document_id).to eq("doc-abc-123")
      expect(document.status).to eq("pending")
      expect(document.signer_links.map(&:url)).to eq([
        "https://autentique.com.br/s/1", "https://autentique.com.br/s/2"
      ])
    end

    it "sends a single signer when only one guardian is on file" do
      captured = stub_create
      single = Gateways::Signature::ValueObjects::SignatureRequest.new(
        name: request.name, pdf: request.pdf, filename: request.filename,
        signers: [ request.signers.first ]
      )

      adapter.create_document(single)

      operations = JSON.parse(extract_operations(captured[:body]))
      expect(operations.dig("variables", "signers").length).to eq(1)
    end

    describe "failures" do
      # GraphQL answers 200 even when it refuses the query, so the body has to be read.
      it "raises a validation error when GraphQL reports one" do
        stub_create(body: { errors: [ { message: "E-mail inválido" } ] }.to_json)

        expect { adapter.create_document(request) }
          .to raise_error(Gateways::Signature::ValidationError, /E-mail inválido/)
      end

      it "raises an authentication error on a rejected token" do
        stub_create(status: 401, body: "{}")

        expect { adapter.create_document(request) }
          .to raise_error(Gateways::Signature::AuthenticationError)
      end

      # The provider caps callers at 60 requests a minute; that is worth retrying.
      it "treats the rate limit as transient" do
        stub_create(status: 429, body: "{}")

        expect { adapter.create_document(request) }
          .to raise_error(Gateways::Signature::TransientError, /rate limit/)
      end

      it "treats a provider fault as transient" do
        stub_create(status: 502, body: "{}")

        expect { adapter.create_document(request) }.to raise_error(Gateways::Signature::TransientError)
      end

      it "treats a timeout as transient" do
        stub_request(:post, endpoint).to_timeout

        expect { adapter.create_document(request) }.to raise_error(Gateways::Signature::TransientError)
      end

      it "raises when the body is not JSON" do
        stub_create(body: "<html>gateway</html>")

        expect { adapter.create_document(request) }
          .to raise_error(Gateways::Signature::ValidationError, /not JSON/)
      end
    end
  end

  describe "#fetch_document" do
    it "reports a document as signed only once every signer has signed" do
      stub_request(:post, endpoint).to_return(
        status: 200,
        body: {
          data: {
            document: {
              id: "doc-abc-123",
              signatures: [
                { public_id: "s1", email: "maria@example.com", signed: { created_at: "2026-08-09" } },
                { public_id: "s2", email: "joao@example.com", signed: { created_at: "2026-08-09" } }
              ]
            }
          }
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect(adapter.fetch_document(provider_document_id: "doc-abc-123").status).to eq("signed")
    end

    it "reports a partially signed document as still pending" do
      stub_request(:post, endpoint).to_return(
        status: 200,
        body: {
          data: {
            document: {
              id: "doc-abc-123",
              signatures: [
                { public_id: "s1", email: "maria@example.com", signed: { created_at: "2026-08-09" } },
                { public_id: "s2", email: "joao@example.com", signed: nil }
              ]
            }
          }
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect(adapter.fetch_document(provider_document_id: "doc-abc-123").status).to eq("pending")
    end

    # Autentique lists the account owner among a document's signatures — no action, and never a
    # signature of their own. Counting them as an outstanding party kept a fully signed contract
    # reading as "pending" for good, which is how a real family's contract sat unnoticed after
    # they had signed it.
    it "ignores the account owner, who is listed but is not a signer" do
      stub_request(:post, endpoint).to_return(
        status: 200,
        body: {
          data: {
            document: {
              id: "doc-abc-123",
              signatures: [
                { public_id: "owner", email: "escola@example.com", action: nil, signed: nil },
                { public_id: "s1", email: "maria@example.com", action: { name: "SIGN" },
                  signed: { created_at: "2026-08-09" } }
              ]
            }
          }
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect(adapter.fetch_document(provider_document_id: "doc-abc-123").status).to eq("signed")
    end

    it "keeps a document pending while one of its signers has not signed" do
      stub_request(:post, endpoint).to_return(
        status: 200,
        body: {
          data: {
            document: {
              id: "doc-abc-123",
              signatures: [
                { public_id: "owner", email: "escola@example.com", action: nil, signed: nil },
                { public_id: "s1", email: "maria@example.com", action: { name: "SIGN" },
                  signed: { created_at: "2026-08-09" } },
                { public_id: "s2", email: "joao@example.com", action: { name: "SIGN" }, signed: nil }
              ]
            }
          }
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect(adapter.fetch_document(provider_document_id: "doc-abc-123").status).to eq("pending")
    end

    # Where the signed file itself lives — the provider's own PDF, with the signature page it
    # appends. The listing links to it rather than to our re-render of what was sent.
    it "carries the address of the signed file" do
      stub_request(:post, endpoint).to_return(
        status: 200,
        body: {
          data: {
            document: {
              id: "doc-abc-123",
              files: { signed: "https://api.autentique.com.br/documentos/doc-abc-123/assinado.pdf" },
              signatures: [
                { public_id: "s1", email: "maria@example.com", action: { name: "SIGN" },
                  signed: { created_at: "2026-08-09" } }
              ]
            }
          }
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      document = adapter.fetch_document(provider_document_id: "doc-abc-123")

      expect(document.signed_file_url)
        .to eq("https://api.autentique.com.br/documentos/doc-abc-123/assinado.pdf")
    end

    # A refusal is not "still waiting": nothing more is coming.
    it "reports a rejected document as rejected" do
      stub_request(:post, endpoint).to_return(
        status: 200,
        body: {
          data: {
            document: {
              id: "doc-abc-123",
              signatures: [
                { public_id: "s1", email: "maria@example.com", action: { name: "SIGN" },
                  signed: nil, rejected: { created_at: "2026-08-09" } }
              ]
            }
          }
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect(adapter.fetch_document(provider_document_id: "doc-abc-123").status).to eq("rejected")
    end
  end

  # The multipart body interleaves parts; this pulls out the `operations` one.
  def extract_operations(body)
    part = body.split(/--\S+\r\n/).find { |section| section.include?('name="operations"') }
    part.split("\r\n\r\n", 2).last.sub(/\r\n\z/, "")
  end
end
