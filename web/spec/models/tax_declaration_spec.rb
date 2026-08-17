# frozen_string_literal: true

require "rails_helper"

RSpec.describe TaxDeclaration, type: :model do
  subject(:declaration) { build(:tax_declaration) }

  it "restricts calendar year to a reasonable range" do
    declaration.calendar_year = 1999

    expect(declaration).not_to be_valid
    expect(declaration.errors[:calendar_year]).to be_present
  end
end
