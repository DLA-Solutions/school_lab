# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::ServiceInvoices", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:student) { create(:student, school: school) }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/me/service_invoices" do
    parameter name: :school_id, in: :path, type: :integer

    get "List guardian service invoices" do
      tags "Billing", "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns family-scoped invoices" do
        let!(:own_invoice) do
          charge = create(:charge, school: school, guardian: guardian)
          payment = create(:payment, charge: charge, school: school)
          create(:service_invoice, :authorized, school: school, charge: charge, payment: payment)
        end
        let!(:other_invoice) do
          other = create(:guardian, school: school)
          charge = create(:charge, school: school, guardian: other)
          payment = create(:payment, charge: charge, school: school)
          create(:service_invoice, :authorized, school: school, charge: charge, payment: payment)
        end

        run_test! do |response|
          ids = JSON.parse(response.body).fetch("data").pluck("id")
          expect(ids).to contain_exactly(own_invoice.id)
          expect(ids).not_to include(other_invoice.id)
        end
      end
    end
  end
end
