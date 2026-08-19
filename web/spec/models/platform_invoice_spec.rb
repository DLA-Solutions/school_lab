# frozen_string_literal: true

require "rails_helper"

RSpec.describe PlatformInvoice, type: :model do
  it "requires amount_cents and a known status" do
    school = create(:school)
    plan = PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter)
    subscription = create(:platform_subscription, school: school, platform_plan: plan)
    invoice = build(:platform_invoice, school: school, platform_subscription: subscription, status: "open")

    expect(invoice).to be_valid
    invoice.status = "bogus"
    expect(invoice).not_to be_valid
  end
end
