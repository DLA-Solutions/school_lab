# frozen_string_literal: true

require "rails_helper"

RSpec.describe CrmContact, type: :model do
  it "is valid with only a name and defaults to a cold lead" do
    contact = described_class.new(school: create(:school), name: "Maria")

    expect(contact).to be_valid
    expect(contact.temperature).to eq("cold")
  end

  it "requires a name" do
    contact = build(:crm_contact, name: " ")

    expect(contact).not_to be_valid
    expect(contact.errors[:name]).to be_present
  end

  it "only accepts cold, warm and hot as temperature" do
    expect(build(:crm_contact, temperature: "lukewarm")).not_to be_valid

    described_class::TEMPERATURES.each do |value|
      expect(build(:crm_contact, temperature: value)).to be_valid
    end
  end

  it "rejects a malformed email but allows a blank one" do
    expect(build(:crm_contact, email: "not-an-email")).not_to be_valid
    expect(build(:crm_contact, email: "")).to be_valid
  end

  it "normalizes blank contact fields to nil and lowercases the email" do
    contact = create(:crm_contact, email: "  Maria@Example.COM ", phone: "  ", notes: "")

    expect(contact.email).to eq("maria@example.com")
    expect(contact.phone).to be_nil
    expect(contact.notes).to be_nil
  end

  describe ".search" do
    let(:school) { create(:school) }

    it "matches name, email or phone case-insensitively and treats % literally" do
      by_name = create(:crm_contact, school: school, name: "Joana Prado", email: "a@example.com")
      by_email = create(:crm_contact, school: school, name: "Other", email: "joana.x@example.com")
      by_phone = create(:crm_contact, school: school, name: "Third", phone: "11 91234-5678")

      expect(described_class.search("JOANA")).to contain_exactly(by_name, by_email)
      expect(described_class.search("91234")).to contain_exactly(by_phone)
      expect(described_class.search("%")).to be_empty
    end
  end

  it "soft-deletes with discard" do
    contact = create(:crm_contact)

    contact.discard

    expect(described_class.kept).not_to include(contact)
    expect(contact.reload).to be_discarded
  end

  it "keeps a change history associated with the school" do
    contact = create(:crm_contact)

    contact.update!(temperature: "hot")

    expect(contact.audits.pluck(:action)).to eq(%w[create update])
    expect(contact.audits.last.associated).to eq(contact.school)
  end
end
