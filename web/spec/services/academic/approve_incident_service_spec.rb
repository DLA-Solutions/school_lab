# frozen_string_literal: true

require "rails_helper"

RSpec.describe Academic::ApproveIncidentService do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school) }
  let(:incident) { create(:incident, school: school) }

  subject(:result) { described_class.call(incident: incident, membership: membership) }

  context "AC-IN04 — two-slot approval, coordination first" do
    let(:membership) { create(:membership, :coordination, school: school) }

    it "fills only the coordination slot and leaves status pending_approval" do
      expect(result).to be_success
      expect(result.data.status).to eq("pending_approval")
      expect(result.data.coordination_approved_at).to be_present
      expect(result.data.coordination_approved_by_membership).to eq(membership)
      expect(result.data.director_approved_at).to be_nil
    end

    it "then becomes approved once a director membership approves too" do
      described_class.call(incident: incident, membership: membership)

      director = create(:membership, :director, school: school)
      second = described_class.call(incident: incident, membership: director)

      expect(second).to be_success
      expect(second.data.status).to eq("approved")
      expect(second.data.coordination_approved_at).to be_present
      expect(second.data.director_approved_at).to be_present
    end
  end

  context "AC-IN04 — two-slot approval, director first" do
    it "either order converges on approved once both slots are filled" do
      director = create(:membership, :director, school: school)
      first = described_class.call(incident: incident, membership: director)
      expect(first.data.status).to eq("pending_approval")
      expect(first.data.director_approved_at).to be_present

      coordination = create(:membership, :coordination, school: school)
      second = described_class.call(incident: incident, membership: coordination)

      expect(second.data.status).to eq("approved")
    end
  end

  context "AC-IN05 — a role template that is neither coordination nor director" do
    # Plain :staff membership with no StaffProfile/role_template at all — `manage_academic`
    # alone (which this membership may or may not hold) never satisfies the approval gate.
    let(:membership) { create(:membership, :staff, school: school) }

    it "fails with forbidden and touches no slot" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:forbidden)

      incident.reload
      expect(incident.coordination_approved_at).to be_nil
      expect(incident.director_approved_at).to be_nil
      expect(incident.status).to eq("pending_approval")
    end
  end

  context "re-approving the same slot" do
    let(:membership) { create(:membership, :coordination, school: school) }

    it "is idempotent — no error, and the second call does not change the timestamp" do
      first = described_class.call(incident: incident, membership: membership)
      first_timestamp = first.data.coordination_approved_at

      travel_to(1.hour.from_now) do
        second = described_class.call(incident: incident, membership: membership)

        expect(second).to be_success
        expect(second.data.coordination_approved_at).to eq(first_timestamp)
      end
    end
  end
end
