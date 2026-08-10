# frozen_string_literal: true

require "rails_helper"

RSpec.describe ProvisioningImport do
  describe "associations" do
    it "belongs to school and uploaded_by" do
      import = create(:provisioning_import)

      expect(import.school).to be_present
      expect(import.uploaded_by).to be_present
    end
  end

  describe "validations" do
    it "accepts previewed, committed, and failed statuses" do
      ProvisioningImport::STATUSES.each do |status|
        import = build(:provisioning_import, status: status)
        expect(import).to be_valid
      end
    end

    it "rejects unknown statuses" do
      import = build(:provisioning_import, status: "processing")
      expect(import).not_to be_valid
    end
  end
end
