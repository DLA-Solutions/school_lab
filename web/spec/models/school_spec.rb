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

  # The school is a party to the contracts it sends, and signs as a legal entity.
  describe "signing its own contracts" do
    it "signs once it has an address and a valid CNPJ" do
      school = build(:school, cnpj: "66.154.330/0001-40",
                              signature_email: "colegionsrgo@gmail.com")

      expect(school).to be_valid
      expect(school.signs_contracts?).to be(true)
    end

    it "does not sign when no address is set" do
      expect(build(:school, cnpj: "66.154.330/0001-40").signs_contracts?).to be(false)
    end

    # An address with no document behind it would reach the provider as a signer it cannot
    # identify, and the whole contract would be rejected with a family already expecting it.
    it "refuses an address while the CNPJ is invalid" do
      school = build(:school, cnpj: "12.345.678/0001-90",
                              signature_email: "colegionsrgo@gmail.com")

      expect(school).not_to be_valid
      expect(school.errors[:signature_email]).to be_present
    end

    it "rejects an address that is not one" do
      school = build(:school, cnpj: "66.154.330/0001-40", signature_email: "nao-e-email")

      expect(school).not_to be_valid
    end

    it "stores the address folded, so it matches the copies list" do
      school = create(:school, cnpj: "66.154.330/0001-40",
                               signature_email: "  Colegionsrgo@Gmail.com  ")

      expect(school.reload.signature_email).to eq("colegionsrgo@gmail.com")
    end
  end
end
