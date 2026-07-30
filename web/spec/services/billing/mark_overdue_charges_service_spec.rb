# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::MarkOverdueChargesService do
  subject(:result) { described_class.call(school: school, as_of: Date.current) }

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let!(:charge) do
    create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.yesterday)
  end

  it "marks pending charges past due as overdue" do
    expect { result }.to change { charge.reload.status }.from("pending").to("overdue")
  end
end
