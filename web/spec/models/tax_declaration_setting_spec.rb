# frozen_string_literal: true

require "rails_helper"

RSpec.describe TaxDeclarationSetting, type: :model do
  subject(:settings) { build(:tax_declaration_setting) }

  it "requires a positive configuration version" do
    settings.configuration_version = 0

    expect(settings).not_to be_valid
    expect(settings.errors[:configuration_version]).to be_present
  end

  describe ".for" do
    let(:school) { create(:school) }

    it "returns an unsaved record when none exists" do
      expect(described_class.for(school)).not_to be_persisted
    end
  end
end
