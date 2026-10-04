# frozen_string_literal: true

require "rails_helper"

RSpec.describe IncidentType, type: :model do
  it "is valid with a school, name, category, and default_visibility" do
    type = build(:incident_type)

    expect(type).to be_valid
  end

  it "rejects an unknown category" do
    type = build(:incident_type, category: "whatever")

    expect(type).not_to be_valid
    expect(type.errors[:category]).to be_present
  end

  it "rejects an unknown default_visibility" do
    type = build(:incident_type, default_visibility: "whatever")

    expect(type).not_to be_valid
    expect(type.errors[:default_visibility]).to be_present
  end

  it "enforces a unique name per school among kept rows" do
    school = create(:school)
    create(:incident_type, school: school, name: "Advertência")
    duplicate = build(:incident_type, school: school, name: "Advertência")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:name]).to be_present
  end

  it "allows the same name again once the original is discarded" do
    school = create(:school)
    original = create(:incident_type, school: school, name: "Advertência")
    original.discard

    duplicate = build(:incident_type, school: school, name: "Advertência")

    expect(duplicate).to be_valid
  end

  it "enforces a unique system_key per school among kept rows" do
    school = create(:school)
    create(:incident_type, :guardian_meeting, school: school)
    duplicate = build(:incident_type, school: school, system_key: IncidentType::GUARDIAN_MEETING_SYSTEM_KEY)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:system_key]).to be_present
  end

  describe ".provision_guardian_meeting!" do
    it "creates the seeded 'Reunião com os pais' type on first use" do
      school = create(:school)

      type = described_class.provision_guardian_meeting!(school)

      expect(type).to be_persisted
      expect(type.name).to eq("Reunião com os pais")
      expect(type.category).to eq("pastoral")
      expect(type.default_visibility).to eq("staff_only")
      expect(type.system_key).to eq(IncidentType::GUARDIAN_MEETING_SYSTEM_KEY)
      expect(type.is_system).to be(true)
    end

    it "is idempotent — calling it twice returns the same row" do
      school = create(:school)

      first = described_class.provision_guardian_meeting!(school)
      second = described_class.provision_guardian_meeting!(school)

      expect(second.id).to eq(first.id)
      expect(described_class.where(school: school, system_key: IncidentType::GUARDIAN_MEETING_SYSTEM_KEY).count)
        .to eq(1)
    end

    it "provisions independently per school" do
      first_school = create(:school)
      second_school = create(:school)

      first_type = described_class.provision_guardian_meeting!(first_school)
      second_type = described_class.provision_guardian_meeting!(second_school)

      expect(first_type.id).not_to eq(second_type.id)
    end
  end
end
