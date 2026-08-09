# frozen_string_literal: true

require "rails_helper"

RSpec.describe Guardian do
  it "requires a name" do
    guardian = build(:guardian, name: nil)

    expect(guardian).not_to be_valid
    expect(guardian.errors[:name]).to be_present
  end

  %i[cpf email phone].each do |attribute|
    it "requires #{attribute}" do
      guardian = build(:guardian, attribute => nil)

      expect(guardian).not_to be_valid
      expect(guardian.errors[attribute]).to be_present
    end
  end

  it "rejects a malformed email" do
    guardian = build(:guardian, email: "maria(at)example.com")

    expect(guardian).not_to be_valid
    expect(guardian.errors[:email]).to be_present
  end

  describe "cpf" do
    it "stores only the digits, whatever the caller typed" do
      guardian = create(:guardian, cpf: "123.456.789-09")

      expect(guardian.cpf).to eq("12345678909")
      expect(guardian.formatted_cpf).to eq("123.456.789-09")
    end

    it "rejects check digits that do not match" do
      guardian = build(:guardian, cpf: "123.456.789-00")

      expect(guardian).not_to be_valid
      expect(guardian.errors[:cpf]).to be_present
    end

    it "rejects a repeated-digit sequence that passes the arithmetic by accident" do
      guardian = build(:guardian, cpf: "111.111.111-11")

      expect(guardian).not_to be_valid
    end

    it "rejects a second guardian with the same CPF in the school, however it is formatted" do
      school = create(:school)
      create(:guardian, school: school, cpf: "12345678909")

      duplicate = build(:guardian, school: school, cpf: "123.456.789-09")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:cpf]).to be_present
    end

    it "allows the same CPF in a different school" do
      create(:guardian, school: create(:school), cpf: "12345678909")

      other = build(:guardian, school: create(:school), cpf: "12345678909")

      expect(other).to be_valid
    end

    it "frees the CPF again once the guardian is discarded" do
      school = create(:school)
      create(:guardian, school: school, cpf: "12345678909").discard!

      expect(build(:guardian, school: school, cpf: "12345678909")).to be_valid
    end
  end

  describe "address" do
    let(:address) do
      {
        zip_code: "01310-100",
        street: "Avenida Paulista",
        number: "1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "sp"
      }
    end

    it "is required in full" do
      guardian = build(:guardian, city: nil, zip_code: nil)

      expect(guardian).not_to be_valid
      expect(guardian.errors[:city]).to be_present
      expect(guardian.errors[:zip_code]).to be_present
    end

    it "normalizes the CEP to digits and upcases the UF" do
      guardian = create(:guardian, **address)

      expect(guardian.zip_code).to eq("01310100")
      expect(guardian.state).to eq("SP")
    end

    # Plenty of addresses have no apartment or block, so this one field stays optional.
    it "accepts an address with no complement" do
      expect(build(:guardian, **address, complement: nil)).to be_valid
    end

    it "accepts a complete address" do
      expect(build(:guardian, **address)).to be_valid
    end

    it "rejects a CEP that is not eight digits" do
      guardian = build(:guardian, **address, zip_code: "0131")

      expect(guardian).not_to be_valid
      expect(guardian.errors[:zip_code]).to be_present
    end

    it "rejects a UF that is not two letters" do
      guardian = build(:guardian, **address, state: "SPX")

      expect(guardian).not_to be_valid
      expect(guardian.errors[:state]).to be_present
    end
  end
end
