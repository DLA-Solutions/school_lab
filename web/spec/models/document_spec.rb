# frozen_string_literal: true

require "rails_helper"

RSpec.describe Document, type: :model do
  subject(:document) { build(:document) }

  it "is valid with default factory" do
    expect(document).to be_valid
  end

  it "requires a document type" do
    document.document_type = nil
    expect(document).not_to be_valid
  end

  it "requires an attached file" do
    document.file.purge
    expect(document).not_to be_valid
  end

  it "starts in pending status" do
    document.save!
    expect(document.status).to eq("pending")
  end

  describe "contract link" do
    let(:school) { create(:school) }
    let(:student) { create(:student, school: school) }
    let(:contract) { create(:contract, school: school, student: student) }

    it "is optional" do
      expect(build(:document, school: school, documentable: student, contract: nil)).to be_valid
    end

    it "allows only one document per contract" do
      create(:document, school: school, documentable: student, contract: contract)

      duplicate = build(:document, school: school, documentable: student, contract: contract)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors).to be_added(:contract_id, :taken, value: contract.id)
    end

    it "is enforced by the database even when validations are skipped" do
      create(:document, school: school, documentable: student, contract: contract)
      duplicate = build(:document, school: school, documentable: student, contract: contract)

      expect { duplicate.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "does not limit documents without a contract" do
      create(:document, school: school, documentable: student)

      expect(build(:document, school: school, documentable: student)).to be_valid
    end

    it "must belong to the same school as the document" do
      other_contract = create(:contract)

      document = build(:document, school: school, documentable: student, contract: other_contract)

      expect(document).not_to be_valid
      expect(document.errors).to be_added(:contract, :invalid)
    end
  end

  it "does not offer signed_contract as a guardian upload type" do
    expect(described_class::GUARDIAN_DOCUMENT_TYPES).not_to include("signed_contract")
  end

  describe "compliance catalog (BC5)" do
    let(:school) { create(:school) }

    it "lists the seven stable keys" do
      expect(described_class::COMPLIANCE_DOCUMENT_TYPES).to eq(
        %w[sanitary_inspection fire_department_certificate municipal_education_council_resolution
           state_education_council_resolution pest_control water_tank_cleaning first_aid_certificate]
      )
    end

    it "has a label in both locales for every key" do
      %i[pt-BR en].each do |locale|
        described_class::COMPLIANCE_DOCUMENT_TYPES.each do |key|
          expect(I18n.exists?("documents.compliance_types.#{key}", locale)).to be(true)
        end
      end
    end

    it "accepts a compliance type owned by the school" do
      expect(build(:document, school: school, documentable: school, document_type: "pest_control")).to be_valid
    end

    it "rejects a compliance type owned by a student, guardian or teacher" do
      [ create(:student, school: school), create(:guardian, school: school), create(:teacher, school: school) ].each do |owner|
        document = build(:document, school: school, documentable: owner, document_type: "sanitary_inspection")

        expect(document).not_to be_valid
        expect(document.errors).to be_added(:documentable_type, :invalid)
      end
    end

    it "keeps free-form types open on the school" do
      expect(build(:document, school: school, documentable: school, document_type: "lease_agreement")).to be_valid
    end

    it "scopes compliance files to School owners with a catalog type" do
      file = create(:document, school: school, documentable: school, document_type: "pest_control")
      create(:document, school: school, documentable: school, document_type: "lease_agreement")
      create(:document, school: school, documentable: create(:student, school: school))

      expect(described_class.compliance).to contain_exactly(file)
    end
  end
end
