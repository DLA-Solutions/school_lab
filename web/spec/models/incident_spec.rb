# frozen_string_literal: true

require "rails_helper"

RSpec.describe Incident, type: :model do
  it "is valid with the factory defaults" do
    incident = build(:incident)

    expect(incident).to be_valid
  end

  it "rejects an unknown visibility" do
    incident = build(:incident, visibility: "whatever")

    expect(incident).not_to be_valid
    expect(incident.errors[:visibility]).to be_present
  end

  it "rejects an unknown status" do
    incident = build(:incident, status: "whatever")

    expect(incident).not_to be_valid
    expect(incident.errors[:status]).to be_present
  end

  it "rejects a student from a different school" do
    school = create(:school)
    other_school_student = create(:student)
    incident = build(:incident, school: school, student: other_school_student)

    expect(incident).not_to be_valid
    expect(incident.errors[:student]).to be_present
  end

  it "rejects an incident_type from a different school" do
    school = create(:school)
    other_school_type = create(:incident_type)
    incident = build(:incident, school: school, incident_type: other_school_type)

    expect(incident).not_to be_valid
    expect(incident.errors[:incident_type]).to be_present
  end

  describe "category/severity snapshot" do
    it "copies category and severity from the incident_type at creation" do
      school = create(:school)
      type = create(:incident_type, :health, school: school, severity: "high")
      incident = create(:incident, school: school, incident_type: type, category: nil, severity: nil)

      expect(incident.category).to eq("health")
      expect(incident.severity).to eq("high")
    end

    it "does not overwrite an explicitly set category" do
      school = create(:school)
      type = create(:incident_type, :health, school: school)
      incident = create(:incident, school: school, incident_type: type, category: "disciplinary")

      expect(incident.category).to eq("disciplinary")
    end

    it "does not follow a later change to the type's category (snapshot, not a join)" do
      incident = create(:incident)
      incident.incident_type.update!(category: "disciplinary")

      expect(incident.reload.category).not_to eq("disciplinary")
    end
  end

  describe "#publish!" do
    it "sets published_at" do
      incident = create(:incident, :pending_publish)

      incident.publish!

      expect(incident.published_at).to be_present
      expect(incident).to be_published
    end

    it "is idempotent — calling it twice keeps the first timestamp" do
      incident = create(:incident, :pending_publish)
      incident.publish!
      first_published_at = incident.published_at

      incident.publish!

      expect(incident.published_at).to eq(first_published_at)
    end
  end

  describe "approval gate (BR-IN08)" do
    it "stays pending_approval with only the coordination slot filled" do
      incident = create(:incident)
      coordination = create(:membership, :coordination, school: incident.school)

      incident.approve_coordination!(coordination)

      expect(incident).to be_pending_approval
      expect(incident.coordination_approved_at).to be_present
      expect(incident.director_approved_at).to be_blank
    end

    it "becomes approved once both slots are filled, in either order" do
      incident = create(:incident)
      director = create(:membership, :director, school: incident.school)
      coordination = create(:membership, :coordination, school: incident.school)

      incident.approve_director!(director)
      expect(incident.reload).to be_pending_approval

      incident.approve_coordination!(coordination)

      expect(incident.reload).to be_approved
      expect(incident.both_approvals_present?).to be(true)
    end

    it "re-approving the same slot is idempotent — no error, timestamp unchanged" do
      incident = create(:incident)
      coordination = create(:membership, :coordination, school: incident.school)
      incident.approve_coordination!(coordination)
      first_timestamp = incident.coordination_approved_at

      expect { incident.approve_coordination!(coordination) }.not_to raise_error

      expect(incident.reload.coordination_approved_at).to eq(first_timestamp)
    end
  end
end
