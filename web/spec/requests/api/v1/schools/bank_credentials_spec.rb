# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::BankCredentials", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :backoffice, user: backoffice_user) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:teacher_user) { create(:user) }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }

  def uploaded_pem(content, filename)
    file = Tempfile.new(filename)
    file.write(content)
    file.rewind
    Rack::Test::UploadedFile.new(file.path, "application/x-pem-file", original_filename: filename)
  end

  path "/api/v1/schools/{school_id}/bank_credentials" do
    parameter name: :school_id, in: :path, type: :integer

    get "List bank credentials" do
      tags "Backoffice"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "lists metadata only" do
        before do
          create(:school_payment_provider, :cora, :inactive, school: school)
          create(:school_payment_provider, :cora, :active, school: school)
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body.size).to eq(2)
          expect(body.count { |row| row["active"] }).to eq(1)
          expect(body.first.keys).not_to include("certificate_pem", "private_key_pem")
          expect(body.first["certificate_fingerprint"]).to be_present
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      # The school's own billing staff may read and replace their own school's credentials: the
      # bank issued the certificate to them, and a certificate expires — waiting on the platform to
      # replace it stops their billing.
      response "200", "allowed for the school's own billing staff" do
        let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body)).to have_key("data")
        end
      end

      response "403", "forbidden for school staff without billing" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end
    end

    upload_body = {
      required: true,
      content: {
        "multipart/form-data" => {
          schema: {
            type: :object,
            required: %w[provider instrument client_id certificate private_key],
            properties: {
              provider: {
                type: :string,
                enum: Gateways::BankSlip::Registry::API_SELECTABLE_PROVIDERS,
                description: "Payment provider the credentials belong to"
              },
              instrument: {
                type: :string,
                enum: SchoolPaymentProvider::INSTRUMENTS,
                description: "Payment instrument the configuration is used for"
              },
              client_id: {
                type: :string,
                description: "Client identifier issued by the provider"
              },
              certificate: {
                type: :string,
                format: :binary,
                description: "mTLS client certificate, PEM encoded"
              },
              private_key: {
                type: :string,
                format: :binary,
                description: "Private key matching the certificate, PEM encoded"
              }
            }
          }
        }
      }
    }

    # The body is declared here instead of through the `formData` parameters below because
    # rswag 2.17 turns the first parameter carrying a schema into the whole request body —
    # which published this form as a bare string. The parameters stay schema-less so they
    # only feed the request payload the examples send.
    post "Upload bank credentials", operation: { requestBody: upload_body } do
      tags "Backoffice"
      consumes "multipart/form-data"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :provider, in: :formData, required: true
      parameter name: :instrument, in: :formData, required: true
      parameter name: :client_id, in: :formData, required: true
      parameter name: :certificate, in: :formData, required: true
      parameter name: :private_key, in: :formData, required: true

      # The published body has to keep agreeing with what the endpoint accepts. `fake` fabricates
      # a boleto that collects nothing, so it must never be offered; and a field may only be
      # marked required while every offered provider actually needs it.
      it "offers only the providers the API accepts" do
        published = upload_body.dig(:content, "multipart/form-data", :schema, :properties, :provider, :enum)

        expect(published).to include("cora")
        expect(published).not_to include("fake")
      end

      it "requires the credentials every offered provider needs" do
        needed = Gateways::BankSlip::Registry::API_SELECTABLE_PROVIDERS.map do |provider|
          SchoolPaymentProvider::REQUIRED_CREDENTIALS.fetch(provider)
        end

        expect(needed.uniq).to eq([ %i[client_id certificate_pem private_key_pem] ])
      end

      response "201", "valid certificate pair uploaded" do
        let(:provider) { "cora" }
        let(:instrument) { "bank_slip" }
        let(:client_id) { "client-stage-001" }
        let(:certificate) { uploaded_pem(pair[:certificate_pem], "cert.pem") }
        let(:private_key) { uploaded_pem(pair[:private_key_pem], "key.pem") }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["certificate_fingerprint"]).to be_present
          expect(body["provider"]).to eq("cora")
          expect(body["active"]).to be(true)
          expect(body.keys).not_to include("certificate_pem", "private_key_pem", "environment")
          expect(SchoolPaymentProvider.find(body["id"]).uploaded_by_id).to eq(backoffice_user.id)
        end
      end

      response "201", "supersedes previous active configuration" do
        let(:provider) { "cora" }
        let(:instrument) { "bank_slip" }
        let(:client_id) { "client-prod-002" }
        let(:certificate) { uploaded_pem(pair[:certificate_pem], "cert.pem") }
        let(:private_key) { uploaded_pem(pair[:private_key_pem], "key.pem") }

        before do
          create(:school_payment_provider, :cora, :active, school: school)
        end

        run_test! do
          configs = SchoolPaymentProvider.where(school: school, instrument: "bank_slip")

          expect(configs.count).to eq(2)
          expect(configs.active.pluck(:client_id)).to eq([ "client-prod-002" ])
        end
      end

      response "422", "provider not accepted by the API" do
        let(:provider) { "fake" }
        let(:instrument) { "bank_slip" }
        let(:client_id) { "client-stage-001" }
        let(:certificate) { uploaded_pem(pair[:certificate_pem], "cert.pem") }
        let(:private_key) { uploaded_pem(pair[:private_key_pem], "key.pem") }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details")).to have_key("provider")
          expect(SchoolPaymentProvider.count).to eq(0)
        end
      end

      response "422", "invalid certificate" do
        let(:provider) { "cora" }
        let(:instrument) { "bank_slip" }
        let(:client_id) { "client-stage-001" }
        let(:certificate) { uploaded_pem("not-a-cert", "cert.pem") }
        let(:private_key) { uploaded_pem(pair[:private_key_pem], "key.pem") }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details")).to have_key("certificate")
        end
      end

      response "422", "mismatched private key" do
        let(:mismatched) { OpensslCertificateHelper.mismatched_key_pair }
        let(:provider) { "cora" }
        let(:instrument) { "bank_slip" }
        let(:client_id) { "client-stage-001" }
        let(:certificate) { uploaded_pem(mismatched[:certificate_pem], "cert.pem") }
        let(:private_key) { uploaded_pem(mismatched[:private_key_pem], "key.pem") }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "details")).to have_key("private_key")
        end
      end

      response "422", "expired certificate" do
        let(:expired) { OpensslCertificateHelper.expired_certificate_pair }
        let(:provider) { "cora" }
        let(:instrument) { "bank_slip" }
        let(:client_id) { "client-stage-001" }
        let(:certificate) { uploaded_pem(expired[:certificate_pem], "cert.pem") }
        let(:private_key) { uploaded_pem(expired[:private_key_pem], "key.pem") }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "details")).to have_key("certificate")
        end
      end

      response "403", "forbidden for guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
        let(:provider) { "cora" }
        let(:instrument) { "bank_slip" }
        let(:client_id) { "client-stage-001" }
        let(:certificate) { uploaded_pem(pair[:certificate_pem], "cert.pem") }
        let(:private_key) { uploaded_pem(pair[:private_key_pem], "key.pem") }

        run_test!
      end

      response "403", "forbidden for teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
        let(:provider) { "cora" }
        let(:instrument) { "bank_slip" }
        let(:client_id) { "client-stage-001" }
        let(:certificate) { uploaded_pem(pair[:certificate_pem], "cert.pem") }
        let(:private_key) { uploaded_pem(pair[:private_key_pem], "key.pem") }

        run_test!
      end
    end
  end

  # The widened rule reaches the caller's own school and no further: nothing here lets one school
  # read, or replace, another's certificate.
  describe "one school cannot reach another's credentials" do
    let(:other_school) { create(:school) }

    it "refuses a listing for a school the caller has no membership in" do
      create(:school_payment_provider, :cora, :active, school: other_school)

      get "/api/v1/schools/#{other_school.id}/bank_credentials",
          headers: auth_headers_for(school_admin)

      expect(response).to have_http_status(:forbidden)
    end

    it "refuses an upload to a school the caller has no membership in" do
      post "/api/v1/schools/#{other_school.id}/bank_credentials",
           params: {
             provider: "cora", instrument: "bank_slip", client_id: "abc",
             certificate: uploaded_pem(pair[:certificate], "cert.pem"),
             private_key: uploaded_pem(pair[:private_key], "key.pem")
           },
           headers: auth_headers_for(school_admin)

      expect(response).to have_http_status(:forbidden)
      expect(other_school.school_payment_providers).to be_empty
    end
  end
end
