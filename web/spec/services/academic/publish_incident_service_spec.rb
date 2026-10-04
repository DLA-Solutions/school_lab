# frozen_string_literal: true

require "rails_helper"

RSpec.describe Academic::PublishIncidentService do
  let(:school) { create(:school) }

  subject(:result) { described_class.call(incident: incident) }

  context "when the incident has guardian_on_publish visibility and is still a draft" do
    let(:incident) { create(:incident, :pending_publish, school: school) }

    it "publishes it and emits the IncidentPublished job" do
      expect { result }.to have_enqueued_job(Incidents::IncidentPublishedJob).with(incident.id, school.id)

      expect(result).to be_success
      expect(result.data.published_at).to be_present
      expect(incident.reload.published_at).to be_present
    end
  end

  context "when the incident is already published" do
    let(:incident) { create(:incident, :published, school: school) }

    it "is an idempotent no-op success and does not re-enqueue the job" do
      published_at = incident.published_at

      expect { result }.not_to have_enqueued_job(Incidents::IncidentPublishedJob)

      expect(result).to be_success
      expect(result.data.published_at).to eq(published_at)
    end
  end

  context "when the incident's visibility is staff_only" do
    let(:incident) { create(:incident, school: school, visibility: "staff_only") }

    it "fails with invalid_state_transition and never publishes" do
      expect { result }.not_to have_enqueued_job(Incidents::IncidentPublishedJob)

      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_state_transition)
      expect(incident.reload.published_at).to be_nil
    end
  end
end
