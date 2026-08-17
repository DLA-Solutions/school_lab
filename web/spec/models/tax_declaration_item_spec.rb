# frozen_string_literal: true

require "rails_helper"

RSpec.describe TaxDeclarationItem, type: :model do
  it "requires a billing purpose code" do
    item = build(:tax_declaration_item, billing_purpose_code: nil)

    expect(item).not_to be_valid
    expect(item.errors[:billing_purpose_code]).to be_present
  end
end
