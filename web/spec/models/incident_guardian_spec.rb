require "rails_helper"

# BR-IN11 — the persisted snapshot a staff member's incident ("ata") carries forward even after
# the family's live `student_guardians` links change later.
RSpec.describe IncidentGuardian, type: :model do
  it "is valid with a name and a relationship from a guardian snapshot" do
    incident_guardian = build(:incident_guardian)

    expect(incident_guardian).to be_valid
  end

  it "requires a name" do
    incident_guardian = build(:incident_guardian, name: nil)

    expect(incident_guardian).not_to be_valid
    expect(incident_guardian.errors[:name]).to be_present
  end

  it "requires a relationship from StudentGuardian::RELATIONSHIPS" do
    incident_guardian = build(:incident_guardian, relationship: "uncle")

    expect(incident_guardian).not_to be_valid
    expect(incident_guardian.errors[:relationship]).to be_present
  end

  it "allows a nil guardian_id (BR-IN11 — nullified, not cascaded, on guardian destroy)" do
    incident_guardian = build(:incident_guardian, guardian: nil)

    expect(incident_guardian).to be_valid
  end

  it "survives the guardian being destroyed, keeping its denormalized name/relationship" do
    incident_guardian = create(:incident_guardian, name: "Marcela Silva", relationship: "mother")
    guardian = incident_guardian.guardian

    guardian.destroy!

    expect(incident_guardian.reload.guardian_id).to be_nil
    expect(incident_guardian.name).to eq("Marcela Silva")
    expect(incident_guardian.relationship).to eq("mother")
  end
end
