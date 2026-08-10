# frozen_string_literal: true

require "rails_helper"

RSpec.describe School do
  describe "onboarding validations" do
    it "requires a valid onboarding_status" do
      school = build(:school, onboarding_status: "invalid")

      expect(school).not_to be_valid
      expect(school.errors[:onboarding_status]).to be_present
    end

    it "requires a valid onboarding_mode" do
      school = build(:school, onboarding_mode: "invalid")

      expect(school).not_to be_valid
      expect(school.errors[:onboarding_mode]).to be_present
    end
  end

  describe "onboarding predicates" do
    it "reports provisioning, pending_handoff, and active states" do
      expect(build(:school, onboarding_status: "provisioning")).to be_provisioning
      expect(build(:school, onboarding_status: "pending_handoff")).to be_pending_handoff
      expect(build(:school, onboarding_status: "active")).to be_onboarding_active
    end
  end
end
