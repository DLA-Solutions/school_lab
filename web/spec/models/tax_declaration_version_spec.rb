# frozen_string_literal: true

require "rails_helper"

RSpec.describe TaxDeclarationVersion, type: :model do
  let(:declaration) { create(:tax_declaration, :with_active_version) }
  let(:version) { declaration.active_version }

  it "derives lifecycle from aggregate active_version_id" do
    expect(version.lifecycle).to eq("active")
  end
end
