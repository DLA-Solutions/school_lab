# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolModule, type: :model do
  subject(:school_module) { build(:school_module) }

  it "requires a school and module key" do
    school_module.school = nil
    school_module.module_key = nil

    expect(school_module).not_to be_valid
    expect(school_module.errors[:school]).to be_present
    expect(school_module.errors[:module_key]).to be_present
  end

  it "enforces one row per module key per school" do
    existing = create(:school_module, module_key: "billing")
    duplicate = build(:school_module, school: existing.school, module_key: "billing")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:module_key]).to be_present
  end

  it "rejects unknown module keys" do
    school_module.module_key = "unknown_module"

    expect(school_module).not_to be_valid
    expect(school_module.errors[:module_key]).to be_present
  end
end
