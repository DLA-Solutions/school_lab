# frozen_string_literal: true

require "rails_helper"

RSpec.describe MinutesParticipant, type: :model do
  let(:school) { create(:school) }
  let(:entry) { create(:minutes_entry, school: school) }

  it "is valid with just a name" do
    expect(build(:minutes_participant, school: school, minutes_entry: entry)).to be_valid
  end

  it "normalizes e-mail and CPF to their stored forms" do
    participant = create(:minutes_participant, school: school, minutes_entry: entry,
                                               email: " Ana@Example.COM ", cpf: "529.982.247-25")

    expect(participant).to have_attributes(email: "ana@example.com", cpf: "52998224725")
  end

  it "rejects an invalid CPF and e-mail" do
    participant = build(:minutes_participant, school: school, minutes_entry: entry,
                                              email: "nope", cpf: "111.111.111-11")

    expect(participant).not_to be_valid
    expect(participant.errors.attribute_names).to include(:email, :cpf)
  end

  it "never lets a student sign" do
    student = create(:student, school: school)
    participant = build(:minutes_participant, :signer, school: school, minutes_entry: entry, student: student)

    expect(participant).not_to be_valid
    expect(participant.errors.attribute_names).to include(:signs)
  end

  it "rejects links to another school's people" do
    participant = build(:minutes_participant, school: school, minutes_entry: entry, guardian: create(:guardian))

    expect(participant).not_to be_valid
  end

  it "masks the CPF" do
    participant = build(:minutes_participant, cpf: "52998224725")

    expect(participant.masked_cpf).to eq("***.982.247-**")
  end

  it "keeps the CPF out of the audit trail" do
    participant = create(:minutes_participant, :signer, school: school, minutes_entry: entry, cpf: "52998224725")

    audited = participant.audits.map(&:audited_changes).to_json

    expect(audited).not_to include("52998224725")
    expect(participant.audits.first.audited_changes).to have_key("cpf")
  end

  describe "#signer_ready?" do
    it "needs both an e-mail and a CPF" do
      expect(build(:minutes_participant, :signer)).to be_signer_ready
      expect(build(:minutes_participant, :signer, email: nil)).not_to be_signer_ready
      expect(build(:minutes_participant, :signer, cpf: nil)).not_to be_signer_ready
    end
  end
end
