# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::ProvisioningAuditMetadata do
  let(:school) { create(:school, :provisioning) }
  let(:backoffice_user) { create(:user) }

  before do
    create(:membership, :with_provision_school, user: backoffice_user)
    Current.user = backoffice_user
    Current.school = school
  end

  after do
    Current.reset
    Audited.store.delete(described_class::STORE_KEY)
  end

  describe ".applicable?" do
    it "is true for backoffice with provision_school on a provisioning school" do
      expect(described_class).to be_applicable
    end

    it "is false when the school is not provisioning" do
      school.update!(onboarding_status: "pending_handoff")

      expect(described_class).not_to be_applicable
    end

    it "is false without provision_school permission" do
      Current.user = create(:user)
      create(:membership, :backoffice, user: Current.user)

      expect(described_class).not_to be_applicable
    end
  end

  describe ".comment" do
    it "returns JSON with actor_type and on_behalf_of" do
      expect(JSON.parse(described_class.comment)).to eq(
        "actor_type" => "backoffice",
        "on_behalf_of" => school.id
      )
    end
  end

  describe ".with_comment" do
    it "exposes the comment for the block and clears it afterward" do
      described_class.with_comment do
        expect(described_class.current_comment).to eq(described_class.comment)
      end

      expect(described_class.current_comment).to be_nil
    end
  end
end
