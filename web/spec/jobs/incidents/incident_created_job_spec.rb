# frozen_string_literal: true

require "rails_helper"

RSpec.describe Incidents::IncidentCreatedJob, type: :job do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }

  def perform_for(incident)
    described_class.perform_now(incident.id, incident.school_id)
  end

  context "when the creator is a teacher (BR-IN09)" do
    it "notifies both coordination- and director-templated staff, and never the teacher" do
      teacher = create(:membership, role: "teacher", school: school)
      other_teacher = create(:membership, role: "teacher", school: school)
      coordination = create(:membership, :coordination, school: school)
      director = create(:membership, :director, school: school)
      incident = create(:incident, school: school, student: student, reported_by_membership: teacher)

      expect { perform_for(incident) }
        .to change(NotificationIntent, :count).by(1)
        .and change(NotificationDelivery, :count).by(2)
        .and have_enqueued_job(Notifications::SendPushNotificationJob).twice

      intent = NotificationIntent.last
      expect(intent.school).to eq(school)
      expect(intent.channel_key).to eq("incidents_staff_review")
      expect(intent.source_type).to eq("Incident")
      expect(intent.source_id).to eq(incident.id)
      expect(intent.payload["body"]).to include("Pedro Silva")

      notified_user_ids = NotificationDelivery.pluck(:user_id)
      expect(notified_user_ids).to contain_exactly(coordination.user_id, director.user_id)
      expect(notified_user_ids).not_to include(teacher.user_id, other_teacher.user_id)
    end
  end

  context "when the creator holds the coordination role template" do
    it "notifies only director-templated staff — not the creator, not other coordination staff, not teachers" do
      creator = create(:membership, :coordination, school: school)
      other_coordination = create(:membership, :coordination, school: school)
      director = create(:membership, :director, school: school)
      teacher = create(:membership, role: "teacher", school: school)
      incident = create(:incident, school: school, student: student, reported_by_membership: creator)

      expect { perform_for(incident) }
        .to change(NotificationIntent, :count).by(1)
        .and change(NotificationDelivery, :count).by(1)

      notified_user_ids = NotificationDelivery.pluck(:user_id)
      expect(notified_user_ids).to contain_exactly(director.user_id)
      expect(notified_user_ids).not_to include(creator.user_id, other_coordination.user_id, teacher.user_id)
    end
  end

  context "when the creator holds the director role template" do
    it "notifies only coordination-templated staff — not the creator, not other director staff, not teachers" do
      creator = create(:membership, :director, school: school)
      other_director = create(:membership, :director, school: school)
      coordination = create(:membership, :coordination, school: school)
      teacher = create(:membership, role: "teacher", school: school)
      incident = create(:incident, school: school, student: student, reported_by_membership: creator)

      expect { perform_for(incident) }
        .to change(NotificationIntent, :count).by(1)
        .and change(NotificationDelivery, :count).by(1)

      notified_user_ids = NotificationDelivery.pluck(:user_id)
      expect(notified_user_ids).to contain_exactly(coordination.user_id)
      expect(notified_user_ids).not_to include(creator.user_id, other_director.user_id, teacher.user_id)
    end
  end

  it "does not fill either BR-IN08 approval slot or change status (informational only)" do
    teacher = create(:membership, role: "teacher", school: school)
    create(:membership, :coordination, school: school)
    create(:membership, :director, school: school)
    incident = create(:incident, school: school, student: student, reported_by_membership: teacher)

    perform_for(incident)

    incident.reload
    expect(incident.status).to eq("pending_approval")
    expect(incident.coordination_approved_at).to be_nil
    expect(incident.director_approved_at).to be_nil
    expect(incident.director_approved_by_membership_id).to be_nil
    expect(incident.coordination_approved_by_membership_id).to be_nil
  end

  it "is a no-op when there is no coordination/director staff to notify" do
    teacher = create(:membership, role: "teacher", school: school)
    incident = create(:incident, school: school, student: student, reported_by_membership: teacher)

    expect { perform_for(incident) }.not_to change(NotificationIntent, :count)
  end

  it "does not raise when the school is missing" do
    teacher = create(:membership, role: "teacher", school: school)
    incident = create(:incident, school: school, student: student, reported_by_membership: teacher)

    expect { described_class.perform_now(incident.id, -1) }.not_to raise_error
  end

  it "does not raise when the incident is missing" do
    expect { described_class.perform_now(-1, school.id) }.not_to raise_error
  end
end
