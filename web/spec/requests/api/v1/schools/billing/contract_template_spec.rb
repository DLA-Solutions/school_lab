# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Contract template", type: :request do
  let(:school) { create(:school, name: "Escola Demo") }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:path) { "/api/v1/schools/#{school.id}/billing/contract_template" }

  describe "GET" do
    # The screen always has something to edit, without a separate "create template" step.
    it "returns a starting agreement when the school has none" do
      get path, headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "body_html")).to include("{{aluno.nome}}")
    end

    it "lists the variables the editor may insert" do
      get path, headers: headers

      tokens = response.parsed_body.dig("data", "variables").map { |v| v["token"] }
      expect(tokens).to include("aluno.nome", "contrato.valor", "responsaveis")
    end

    it "denies a guardian" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      get path, headers: auth_headers_for(guardian_user)

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PUT" do
    it "saves the agreement" do
      put path,
          params: { contract_template: { body_html: "<h1>Meu contrato</h1><p>{{aluno.nome}}</p>" } },
          headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "body_html")).to include("Meu contrato")
      expect(school.reload.contract_template.body_html).to include("Meu contrato")
    end

    # This HTML is rendered in a browser and shipped to the signature provider, so anything
    # executable has to be stripped before it is stored.
    it "strips a script tag" do
      put path,
          params: { contract_template: { body_html: "<p>Olá</p><script>alert(1)</script>" } },
          headers: headers, as: :json

      body = response.parsed_body.dig("data", "body_html")
      expect(body).to include("Olá")
      expect(body).not_to include("script")
    end

    it "strips an inline event handler" do
      put path,
          params: { contract_template: { body_html: '<p onclick="steal()">Olá</p>' } },
          headers: headers, as: :json

      expect(response.parsed_body.dig("data", "body_html")).not_to include("onclick")
    end

    it "strips an iframe" do
      put path,
          params: { contract_template: { body_html: "<iframe src='http://evil'></iframe><p>ok</p>" } },
          headers: headers, as: :json

      expect(response.parsed_body.dig("data", "body_html")).not_to include("iframe")
    end

    it "keeps the formatting a contract needs" do
      markup = "<h2>Cláusula</h2><table><tr><td><strong>Valor</strong></td></tr></table>"

      put path, params: { contract_template: { body_html: markup } }, headers: headers, as: :json

      body = response.parsed_body.dig("data", "body_html")
      expect(body).to include("<h2>", "<table>", "<strong>")
    end

    it "rejects an empty agreement" do
      put path, params: { contract_template: { body_html: "" } }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    # Where the signature lands is the provider's to decide: it lays the page out when it
    # converts the uploaded HTML, so coordinates measured against our own render meant nothing.
    it "ignores a signature position, which the school no longer sets" do
      put path,
          params: { contract_template: { body_html: "<p>ok</p>", signature_x: 140 } },
          headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"]).not_to have_key("signature_x")
    end
  end

  describe "logo" do
    # A one-pixel PNG, so the attachment is a real image rather than bytes that merely claim to be.
    def png
      Rack::Test::UploadedFile.new(
        StringIO.new(
          Base64.decode64(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
          )
        ),
        "image/png", true, original_filename: "logo.png"
      )
    end

    let(:image) do
      Rack::Test::UploadedFile.new(
        StringIO.new("\x89PNG\r\n\x1a\nfake"), "image/png", true, original_filename: "logo-escola.png"
      )
    end

    it "accepts an image and reports it back" do
      put path, params: { contract_template: { body_html: "<p>ok</p>", logo: image } },
                headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "logo_filename")).to eq("logo-escola.png")
      expect(response.parsed_body.dig("data", "logo_url")).to be_present
    end

    it "refuses a file that is not an image" do
      pdf = Rack::Test::UploadedFile.new(
        StringIO.new("%PDF"), "application/pdf", true, original_filename: "nao-imagem.pdf"
      )

      put path, params: { contract_template: { body_html: "<p>ok</p>", logo: pdf } },
                headers: headers

      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "preview" do
    it "renders with stand-in data when the school has no contract yet" do
      get "#{path}/preview", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "sample")).to be(true)
      expect(response.parsed_body.dig("data", "html")).to include("Pedro Silva")
    end

    it "renders with a real contract when there is one" do
      school_class = create(:school_class, school: school)
      student = create(:student, school: school, school_class: school_class, name: "Joana Real")
      guardian = create(:guardian, school: school, name: "Marta Real")
      create(:student_guardian, school: school, student: student, guardian: guardian,
                                relationship: "mother")
      create(:contract, school: school, student: student, negotiated_amount_cents: 125_050)

      get "#{path}/preview", headers: headers

      expect(response.parsed_body.dig("data", "sample")).to be(false)
      html = response.parsed_body.dig("data", "html")
      expect(html).to include("Joana Real")
      expect(html).to include("Marta Real")
      expect(html).to include("1.250,50")
    end
  end
end
