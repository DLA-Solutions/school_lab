# frozen_string_literal: true

require "rails_helper"

RSpec.describe Academic::CreateIncidentService do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school) }
  let(:membership) { create(:membership, :staff, school: school) }

  subject(:result) do
    described_class.call(
      school: school, student: student, reported_by_membership: membership,
      incident_type_id: incident_type_id, description: description,
      guardian_points_raised: guardian_points_raised, school_response: school_response,
      visibility: visibility, guardian_ids: guardian_ids
    )
  end

  let(:incident_type_id) { nil }
  let(:description) { "Discussão em sala de aula." }
  let(:guardian_points_raised) { nil }
  let(:school_response) { nil }
  let(:visibility) { nil }
  let(:guardian_ids) { nil }

  context "when no incident_type_id is given" do
    it "lazily provisions the default guardian-meeting type and uses it (BR-IN01)" do
      expect { result }.to change(IncidentType, :count).by(1)

      expect(result).to be_success
      incident_type = result.data.incident_type
      expect(incident_type.system_key).to eq(IncidentType::GUARDIAN_MEETING_SYSTEM_KEY)
      expect(incident_type.school_id).to eq(school.id)
    end

    it "is idempotent across calls — reuses the same seeded type" do
      first = described_class.call(school: school, student: student, reported_by_membership: membership)
      second_student = create(:student, school: school)
      second = described_class.call(school: school, student: second_student, reported_by_membership: membership)

      expect(first.data.incident_type_id).to eq(second.data.incident_type_id)
      expect(IncidentType.where(school: school, system_key: IncidentType::GUARDIAN_MEETING_SYSTEM_KEY).count)
        .to eq(1)
    end
  end

  context "when an explicit incident_type_id resolves to a kept row in this school" do
    let(:incident_type) { create(:incident_type, :disciplinary, school: school, default_visibility: "guardian") }
    let(:incident_type_id) { incident_type.id }

    it "uses that type and snapshots category/severity from it" do
      expect(result).to be_success
      expect(result.data.incident_type).to eq(incident_type)
      expect(result.data.category).to eq(incident_type.category)
      expect(result.data.severity).to eq(incident_type.severity)
    end
  end

  context "when an explicit incident_type_id does not resolve in this school" do
    let(:incident_type_id) { create(:incident_type).id } # different school

    it "fails with not_found and does not fall back to the default type" do
      expect { result }.not_to change(Incident, :count)

      expect(result).to be_failure
      expect(result.error_code).to eq(:not_found)
    end
  end

  context "when an explicit incident_type_id points to a discarded row" do
    let(:discarded_type) { create(:incident_type, school: school) }
    let(:incident_type_id) { discarded_type.id }

    before { discarded_type.discard }

    it "fails with not_found" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:not_found)
    end
  end

  context "AC-IN01 — health category forces staff_only regardless of the type's own default" do
    let(:incident_type) { create(:incident_type, :health, school: school, default_visibility: "guardian") }
    let(:incident_type_id) { incident_type.id }

    it "resolves visibility to staff_only even though the type's default_visibility is guardian" do
      expect(result).to be_success
      expect(result.data.visibility).to eq("staff_only")
      expect(result.data.published_at).to be_nil
    end
  end

  context "when visibility is explicitly guardian" do
    let(:visibility) { "guardian" }

    it "auto-publishes at creation (UC-IN01 — no separate publish step for guardian visibility)" do
      expect(result).to be_success
      expect(result.data.visibility).to eq("guardian")
      expect(result.data.published_at).to be_present
    end
  end

  context "when visibility is explicitly guardian_on_publish" do
    let(:visibility) { "guardian_on_publish" }

    it "stays a draft — published_at is nil" do
      expect(result).to be_success
      expect(result.data.visibility).to eq("guardian_on_publish")
      expect(result.data.published_at).to be_nil
    end
  end

  context "when visibility is left blank and the resolved type's own default_visibility is guardian" do
    let(:incident_type) { create(:incident_type, :disciplinary, school: school, default_visibility: "guardian") }
    let(:incident_type_id) { incident_type.id }

    it "falls back to the type's default_visibility and auto-publishes" do
      expect(result).to be_success
      expect(result.data.visibility).to eq("guardian")
      expect(result.data.published_at).to be_present
    end
  end

  context "when visibility is invalid" do
    let(:visibility) { "nonsense" }

    it "fails with validation_error (model inclusion validation surfaces it, not pre-filtered)" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details[:visibility]).to be_present
    end
  end

  context "when the student belongs to a different school" do
    let(:student) { create(:student) }

    it "fails with validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details[:student]).to be_present
    end
  end

  it "persists description, guardian_points_raised, and school_response as given" do
    guardian_points = "A família relatou dificuldade de concentração em casa."
    school_response_text = "A escola vai acompanhar com a coordenação pedagógica."

    outcome = described_class.call(
      school: school, student: student, reported_by_membership: membership,
      description: "Reunião registrada.", guardian_points_raised: guardian_points,
      school_response: school_response_text
    )

    expect(outcome).to be_success
    expect(outcome.data.description).to eq("Reunião registrada.")
    expect(outcome.data.guardian_points_raised).to eq(guardian_points)
    expect(outcome.data.school_response).to eq(school_response_text)
  end

  describe "BR-IN09 / UC-IN04 — creation notification" do
    it "emits IncidentCreated (enqueues the staff-review notification job) on a successful save" do
      expect { result }.to have_enqueued_job(Incidents::IncidentCreatedJob)
      expect(result).to be_success

      enqueued = ActiveJob::Base.queue_adapter.enqueued_jobs.find { |job| job[:job] == Incidents::IncidentCreatedJob }
      expect(enqueued[:args]).to eq([ result.data.id, school.id ])
    end

    context "when creation fails validation" do
      let(:visibility) { "nonsense" }

      it "does not emit IncidentCreated" do
        expect { result }.not_to have_enqueued_job(Incidents::IncidentCreatedJob)

        expect(result).to be_failure
      end
    end
  end

  describe "BR-IN11 / UC-IN06 — guardian snapshot (AC-IN08)" do
    let(:mother) { create(:guardian, school: school, name: "Maria Silva") }
    let(:father) { create(:guardian, school: school, name: "João Silva") }

    before do
      create(:student_guardian, school: school, student: student, guardian: mother, relationship: "mother")
      create(:student_guardian, school: school, student: student, guardian: father, relationship: "father")
    end

    context "when guardian_ids is not given (AC-IN08 bullet 1)" do
      it "snapshots the student's current student_guardians (both mother and father)" do
        expect(result).to be_success

        snapshots = result.data.incident_guardians
        expect(snapshots.map { |ig| [ ig.guardian_id, ig.name, ig.relationship ] }).to contain_exactly(
          [ mother.id, "Maria Silva", "mother" ],
          [ father.id, "João Silva", "father" ]
        )
      end
    end

    context "when guardian_ids is given for a guardian not linked to this student via student_guardians" do
      let(:unrelated_guardian) { create(:guardian, school: school, name: "Ana Souza") }
      let(:guardian_ids) { [ unrelated_guardian.id ] }

      it "snapshots exactly that guardian, falling back to relationship: other" do
        expect(result).to be_success

        snapshots = result.data.incident_guardians
        expect(snapshots.size).to eq(1)
        expect(snapshots.first.guardian_id).to eq(unrelated_guardian.id)
        expect(snapshots.first.name).to eq("Ana Souza")
        expect(snapshots.first.relationship).to eq("other")
      end
    end

    context "when guardian_ids includes an id belonging to a guardian from a different school" do
      let(:other_school_guardian) { create(:guardian) } # different school by default
      let(:guardian_ids) { [ other_school_guardian.id, mother.id ] }

      it "silently excludes the cross-tenant id (not a validation error, not a leak)" do
        expect(result).to be_success

        snapshots = result.data.incident_guardians
        expect(snapshots.map(&:guardian_id)).to contain_exactly(mother.id)
      end
    end

    context "when the family's student_guardians links change after the incident was saved" do
      it "leaves the already-created incident_guardians rows unchanged (AC-IN08 bullet 3)" do
        expect(result).to be_success
        incident = result.data
        original_snapshot = incident.incident_guardians.map { |ig| [ ig.guardian_id, ig.name, ig.relationship ] }

        student.student_guardians.kept.find_by(guardian_id: mother.id).discard
        create(:student_guardian, school: school, student: student, guardian: mother, relationship: "other")
        mother.update!(name: "Maria Silva Santos")

        incident.reload
        expect(incident.incident_guardians.map { |ig| [ ig.guardian_id, ig.name, ig.relationship ] })
          .to contain_exactly(*original_snapshot)
      end
    end

    context "when incident creation fails validation" do
      let(:visibility) { "nonsense" }

      it "rolls back cleanly, leaving no stray incident_guardians rows" do
        expect { result }.not_to change(IncidentGuardian, :count)

        expect(result).to be_failure
        expect(result.error_code).to eq(:validation_error)
      end
    end
  end
end
