# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Plan discounts", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:path) { "/api/v1/schools/#{school.id}/billing/plan_discounts" }

  describe "the standard bands" do
    it "provisions the ones a school starts with" do
      post "#{path}/provision_defaults", headers: headers, as: :json

      expect(response).to have_http_status(:created)

      names = response.parsed_body["data"].map { |row| row["name"] }
      expect(names).to include("Desconto 10%", "Desconto 20%", "Desconto 30%", "Desconto 40%",
                               "Bolsa integral")
    end

    it "is idempotent" do
      2.times { post "#{path}/provision_defaults", headers: headers, as: :json }

      expect(school.plan_discounts.kept.count).to eq(PlanDiscount::DEFAULTS.length)
    end

    it "keeps a band the school added itself" do
      create(:plan_discount, school: school, name: "Convênio empresa", percent: 15)

      post "#{path}/provision_defaults", headers: headers, as: :json

      expect(school.plan_discounts.kept.pluck(:name)).to include("Convênio empresa")
    end
  end

  describe "managing bands" do
    it "creates one" do
      post path, params: { plan_discount: { name: "Desconto 15%", percent: 15 } },
                 headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "percent")).to eq(15.0)
    end

    it "rejects a percentage outside 0 and 100" do
      post path, params: { plan_discount: { name: "Impossível", percent: 140 } },
                 headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("percent")
    end

    it "rejects a duplicate name in the same school" do
      create(:plan_discount, school: school, name: "Desconto 10%")

      post path, params: { plan_discount: { name: "Desconto 10%", percent: 10 } },
                 headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "removes one nobody was granted" do
      discount = create(:plan_discount, school: school)

      delete "#{path}/#{discount.id}", headers: headers

      expect(response).to have_http_status(:no_content)
    end

    # Contracts keep pointing at the band they were granted; removing it would erase the
    # explanation for an amount already agreed with a family.
    it "refuses to remove a band a contract was granted, and says how many" do
      discount = create(:plan_discount, school: school)
      create(:contract, school: school, plan_discount: discount)

      delete "#{path}/#{discount.id}", headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details", "base").first).to include("1")
    end

    it "does not reach another school's bands" do
      create(:plan_discount, school: create(:school), name: "Externo")
      create(:plan_discount, school: school, name: "Interno")

      get path, headers: headers

      expect(response.parsed_body["data"].map { |row| row["name"] }).to eq(["Interno"])
    end

    it "denies a guardian" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      get path, headers: auth_headers_for(guardian_user)

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "applying a band" do
    it "takes the percentage off the full amount" do
      discount = create(:plan_discount, school: school, percent: 10)

      expect(discount.apply_to(90_000)).to eq(81_000)
    end

    # A full scholarship leaves nothing to charge.
    it "leaves nothing when the band is a full scholarship" do
      discount = create(:plan_discount, school: school, percent: 100)

      expect(discount.apply_to(90_000)).to eq(0)
    end

    it "rounds to the cent" do
      discount = create(:plan_discount, school: school, percent: 33)

      expect(discount.apply_to(100_00)).to eq(670_0)
    end
  end
end
