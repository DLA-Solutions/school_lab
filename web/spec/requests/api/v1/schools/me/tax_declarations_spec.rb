# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::TaxDeclarations", type: :request do
  include ActiveSupport::Testing::TimeHelpers
  let(:school) { create(:school, cnpj: "66.154.330/0001-40") }
  let(:school_id) { school.id }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
  let!(:signatory) { create(:document_signatory, school: school) }
  let(:calendar_year) { 2025 }

  let(:school_class) { create(:school_class, school: school) }
  let!(:student) { create(:student, school: school, school_class: school_class) }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let!(:tuition_purpose) { create(:billing_purpose, :tuition, :eligible, school: school) }

  def approve_tax_declaration_settings!
    BillingPurpose.provision_defaults!(school)
    digest = Billing::PurposeConfigurationDigest.compute(school.billing_purposes.kept.ordered)
    TaxDeclarationSetting.for(school).update!(
      legal_text: "Declaração anual de pagamentos.",
      legal_text_version: "2026-01",
      document_signatory: signatory,
      legal_accounting_approved_at: Time.current,
      approved_by: create(:user),
      approved_purpose_configuration_digest: digest
    )
  end

  def create_eligible_payment!(paid_amount_cents: 103_000, fine: 1_000, interest: 2_000, paid_at: Time.zone.parse("2025-06-15 12:00:00"))
    charge = create(:charge, school: school, guardian: guardian, contract: create(:contract, school: school, student: student))
    Billing::ApplyChargeClassificationService.call(charge: charge, billing_purpose: tuition_purpose)
    charge.save!
    create(
      :payment,
      school: school,
      charge: charge,
      paid_amount_cents: paid_amount_cents,
      fine_amount_cents: fine,
      interest_amount_cents: interest,
      paid_at: paid_at
    )
  end

  around do |example|
    travel_to Time.zone.parse("2026-01-08 12:00:00") do
      example.run
    end
  end

  path "/api/v1/schools/{school_id}/me/tax_declarations" do
    parameter name: :school_id, in: :path, type: :integer

    get "List guardian tax declarations" do
      tags "Tax Declarations", "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns own aggregates" do
        let!(:declaration) { create(:tax_declaration, :with_active_version, school: school, guardian: guardian, calendar_year: calendar_year) }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.fetch("data").size).to eq(1)
          expect(body.dig("data", 0, "tax_declaration_id")).to eq(declaration.id)
        end
      end
    end

    post "Ensure tax declaration generation" do
      tags "Tax Declarations", "Guardian Me"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          tax_declaration: {
            type: :object,
            properties: {
              calendar_year: { type: :integer }
            },
            required: %w[calendar_year]
          }
        },
        required: %w[tax_declaration]
      }

      response "201", "creates first version" do
        let(:payload) { { tax_declaration: { calendar_year: calendar_year } } }

        before do
          approve_tax_declaration_settings!
          create_eligible_payment!
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["calendar_year"]).to eq(calendar_year)
          expect(body.dig("version", "total_declared_principal_amount_cents")).to eq(100_000)
          expect(body.dig("version", "lifecycle")).to eq("active")
        end
      end

      response "200", "returns unchanged version" do
        let(:payload) { { tax_declaration: { calendar_year: calendar_year } } }

        before do
          approve_tax_declaration_settings!
          create_eligible_payment!
          Billing::TaxDeclarations::EnsureGeneratedService.call(
            school: school,
            guardian: guardian,
            calendar_year: calendar_year
          )
        end

        run_test! do |response|
          expect(response).to have_http_status(:ok)
          body = JSON.parse(response.body).fetch("data")
          expect(body.dig("version", "number")).to eq(1)
        end
      end

      response "422", "calendar year not closed" do
        let(:payload) { { tax_declaration: { calendar_year: 2026 } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("calendar_year_not_closed")
        end
      end

      response "422", "no eligible payments" do
        let(:payload) { { tax_declaration: { calendar_year: calendar_year } } }

        before { approve_tax_declaration_settings! }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("no_eligible_payments")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/me/tax_declarations/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Show guardian tax declaration" do
      tags "Tax Declarations", "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      let!(:declaration) { create(:tax_declaration, :with_active_version, school: school, guardian: guardian, calendar_year: calendar_year) }
      let(:id) { declaration.id }

      response "200", "returns aggregate detail" do
        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["active_version_id"]).to eq(declaration.active_version_id)
        end
      end

      response "404", "cross-family aggregate hidden" do
        let(:other_user) { create(:user) }
        let!(:other_membership) { create(:membership, user: other_user, school: school, role: "guardian") }
        let!(:other_guardian) { create(:guardian, school: school, user: other_user) }
        let(:Authorization) { auth_headers_for(other_user)["Authorization"] }

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/me/tax_declarations/{tax_declaration_id}/versions" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :tax_declaration_id, in: :path, type: :integer

    get "List tax declaration versions" do
      tags "Tax Declarations", "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      let!(:declaration) { create(:tax_declaration, :with_active_version, school: school, guardian: guardian, calendar_year: calendar_year) }
      let(:tax_declaration_id) { declaration.id }

      response "200", "lists versions" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.fetch("data").size).to eq(1)
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/me/tax_declarations/{tax_declaration_id}/versions/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :tax_declaration_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Show tax declaration version" do
      tags "Tax Declarations", "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      let!(:declaration) { create(:tax_declaration, :with_active_version, school: school, guardian: guardian, calendar_year: calendar_year) }
      let(:tax_declaration_id) { declaration.id }
      let(:id) { declaration.active_version_id }

      response "200", "returns version detail" do
        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["lifecycle"]).to eq("active")
        end
      end

      response "404", "version not under aggregate" do
        let(:other_declaration) { create(:tax_declaration, :with_active_version, school: school, guardian: create(:guardian, school: school), calendar_year: 2024) }
        let(:tax_declaration_id) { declaration.id }
        let(:id) { other_declaration.active_version_id }

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/me/tax_declarations/{tax_declaration_id}/versions/{id}/pdf" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :tax_declaration_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Download tax declaration PDF" do
      tags "Tax Declarations", "Guardian Me"
      produces "application/pdf"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: "X-Request-UUID", in: :header, type: :string, required: false

      let!(:declaration) { create(:tax_declaration, :with_active_version, school: school, guardian: guardian, calendar_year: calendar_year) }
      let(:tax_declaration_id) { declaration.id }
      let(:id) { declaration.active_version_id }
      let(:"X-Request-UUID") { "download-req-1" }

      response "200", "returns stored PDF bytes" do
        run_test! do |response|
          expect(response.headers["Content-Type"]).to include("application/pdf")
          expect(TaxDeclarationAccessEvent.where(request_uuid: "download-req-1").count).to eq(1)
        end
      end
    end
  end
end
