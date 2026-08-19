# frozen_string_literal: true

require "rails_helper"

RSpec.describe "school platform subscription", type: :request do
  let(:school) { create(:school) }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let!(:plan) { PlatformPlan.find_or_create_by!(key: "starter") { |row| row.name = "Starter"; row.monthly_amount_cents = 29_900 } }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  before do
    PlatformBillingSetting.instance.update!(active_provider: "fake")
    ensure_platform_plan_prices(plan)
  end

  it "returns null data when the school has no subscription" do
    get "/api/v1/schools/#{school.id}/platform_subscription", headers: auth_headers_for(owner_user)

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["data"]).to be_nil
  end

  it "forbids a guardian" do
    guardian_user = create(:user)
    create(:membership, user: guardian_user, school: school, role: "guardian")

    get "/api/v1/schools/#{school.id}/platform_subscription", headers: auth_headers_for(guardian_user)

    expect(response).to have_http_status(:forbidden)
  end

  it "creates a checkout session for a director" do
    post "/api/v1/schools/#{school.id}/platform_subscription/checkout",
         headers: auth_headers_for(owner_user),
         params: { plan_key: "starter", billing_interval: "month" },
         as: :json

    expect(response).to have_http_status(:created)
    expect(JSON.parse(response.body).dig("data", "checkout_url")).to be_present
  end
end
