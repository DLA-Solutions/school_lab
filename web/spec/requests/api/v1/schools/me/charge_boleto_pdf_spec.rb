# frozen_string_literal: true

require "swagger_helper"

# A guardian previews their own Banco Inter boleto as a PDF. Inter's PDF sits behind mTLS + OAuth,
# so the API fetches it and streams it; the Inter HTTP boundary is stubbed with WebMock.
RSpec.describe "Api::V1::Schools::Me::Charges boleto_pdf", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let(:student) { create(:student, school: school) }
  let!(:student_guardian_link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let!(:provider_config) { create(:school_payment_provider, :inter, school: school) }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
  let(:pdf_bytes) { "%PDF-1.4\nInter boleto fixture".b }

  let(:request_id) { "inter-req-1" }
  let!(:charge) do
    create(:charge, school: school, contract: contract, guardian: guardian).tap do |record|
      create(:charge_issuance, :issued, charge: record, school: school, provider: "inter",
                                        provider_invoice_id: request_id)
      record.sync_invoice_cache!
    end
  end
  let(:id) { charge.id }
  let(:pdf_url) { "#{INTER_TEST_API_BASE_URL}/cobranca/v3/cobrancas/#{request_id}/pdf" }

  before do
    stub_inter_token
    stub_request(:get, pdf_url)
      .to_return(status: 200, body: { pdf: Base64.strict_encode64(pdf_bytes) }.to_json,
                 headers: { "Content-Type" => "application/json" })
  end

  path "/api/v1/schools/{school_id}/me/charges/{id}/boleto_pdf" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "The guardian's own boleto as a PDF (providers that only serve it through an authenticated API)" do
      description "Streams the boleto PDF fetched from the bank. Available only while " \
                  "`payment_methods.boleto_pdf_available` is true on the charge. Never stored; " \
                  "responses are `private, no-store`."
      tags "Guardian Me"
      produces "application/pdf", "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "the PDF of the guardian's own Inter boleto" do
        run_test! do |response|
          expect(response.media_type).to eq("application/pdf")
          expect(response.body.b).to eq(pdf_bytes)
          expect(response.headers["Cache-Control"]).to include("no-store")
          expect(response.headers["Content-Disposition"]).to include("inline", "boleto-#{charge.id}.pdf")
          expect(WebMock).to have_requested(:get, pdf_url).once
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("unauthorized")
        end
      end

      response "403", "non-guardian role" do
        let(:staff_user) { create(:user) }
        let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
          expect(WebMock).not_to have_requested(:get, pdf_url)
        end
      end

      response "404", "another family's charge in the same school" do
        let(:other_guardian) { create(:guardian, school: school) }
        let(:other_student) { create(:student, school: school) }
        let(:other_contract) do
          create(:contract, school: school, student: other_student, billing_plan: billing_plan)
        end
        let!(:charge) do
          create(:charge, school: school, contract: other_contract, guardian: other_guardian).tap do |record|
            create(:charge_issuance, :issued, charge: record, school: school, provider: "inter",
                                              provider_invoice_id: request_id)
          end
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
          expect(WebMock).not_to have_requested(:get, pdf_url)
        end
      end

      response "404", "a guardian of another school" do
        let(:other_school) { create(:school) }
        let(:outsider_user) { create(:user) }
        let!(:outsider_membership) do
          create(:membership, user: outsider_user, school: other_school, role: "guardian")
        end
        let!(:outsider) { create(:guardian, school: other_school, user: outsider_user) }
        let(:Authorization) { auth_headers_for(outsider_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
          expect(WebMock).not_to have_requested(:get, pdf_url)
        end
      end

      response "404", "a discarded charge" do
        before { charge.discard }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "409", "the bank has not registered the boleto yet" do
        before { charge.current_issuance.update!(digitable_line: nil, pix_emv: nil) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("boleto_pdf_unavailable")
          expect(WebMock).not_to have_requested(:get, pdf_url)
        end
      end

      response "409", "the charge is already paid" do
        before { charge.pay! }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("boleto_pdf_unavailable")
        end
      end

      response "409", "the charge is cancelled" do
        before { charge.cancel! }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("boleto_pdf_unavailable")
        end
      end

      response "409", "the provider serves a hosted boleto_url instead of a PDF (Cora)" do
        before { charge.current_issuance.update!(provider: "cora") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("boleto_pdf_unavailable")
        end
      end

      response "502", "the bank answered with something that is not a PDF" do
        before do
          stub_request(:get, pdf_url).to_return(status: 200, body: { pdf: Base64.strict_encode64("<html>") }.to_json)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("boleto_pdf_provider_error")
        end
      end

      response "502", "the bank rejected the credentials or scope" do
        before { stub_request(:get, pdf_url).to_return(status: 403, body: "") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("boleto_pdf_provider_error")
        end
      end

      response "503", "the bank is temporarily unavailable" do
        before { stub_request(:get, pdf_url).to_return(status: 503, body: "") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("boleto_pdf_provider_unavailable")
        end
      end
    end
  end
end
