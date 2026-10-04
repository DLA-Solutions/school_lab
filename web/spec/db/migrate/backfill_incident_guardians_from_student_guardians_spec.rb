# frozen_string_literal: true

require "rails_helper"
require Rails.root.join("db/migrate/20261004142511_backfill_incident_guardians_from_student_guardians.rb")

# AC-IN08 bullet 4 — existing incidents (created before BR-IN11 shipped) get `incident_guardians`
# rows matching their student's `student_guardians` as they stood at migration time. The
# migration itself already ran against dev/test when it was generated; this spec exercises its
# `up` SQL directly against fresh fixtures to prove the backfill logic, independent of whatever
# state happened to exist in this database when the migration file was first applied.
RSpec.describe BackfillIncidentGuardiansFromStudentGuardians do
  it "inserts incident_guardians from each incident's student's current kept student_guardians" do
    school = create(:school)
    # Shared: `:incident_type`'s factory default (`:guardian_meeting`) is a system row, unique
    # per school, so the second `create(:incident, ...)` below must reuse one rather than let
    # the factory provision a second for the same school.
    incident_type = create(:incident_type, :guardian_meeting, school: school)
    pedro = create(:student, school: school)
    mother = create(:guardian, school: school, name: "Marcela Silva")
    create(:student_guardian, school: school, student: pedro, guardian: mother, relationship: "mother")
    incident = create(:incident, school: school, student: pedro, incident_type: incident_type)

    childless_student = create(:student, school: school)
    childless_incident = create(:incident, school: school, student: childless_student, incident_type: incident_type)

    expect { described_class.new.up }.to change(IncidentGuardian, :count).by(1)

    row = IncidentGuardian.find_by(incident: incident)
    expect(row).to have_attributes(guardian_id: mother.id, name: "Marcela Silva", relationship: "mother")
    expect(IncidentGuardian.where(incident: childless_incident)).to be_empty
  end

  it "skips a discarded student_guardians link, same as a student with no guardians" do
    school = create(:school)
    pedro = create(:student, school: school)
    mother = create(:guardian, school: school, name: "Marcela Silva")
    link = create(:student_guardian, school: school, student: pedro, guardian: mother, relationship: "mother")
    link.discard!
    create(:incident, school: school, student: pedro)

    expect { described_class.new.up }.not_to change(IncidentGuardian, :count)
  end

  it "backfills one row per guardian for a student with both a mother and a father" do
    school = create(:school)
    pedro = create(:student, school: school)
    mother = create(:guardian, school: school, name: "Marcela Silva")
    father = create(:guardian, school: school, name: "Roberto Silva")
    create(:student_guardian, school: school, student: pedro, guardian: mother, relationship: "mother")
    create(:student_guardian, school: school, student: pedro, guardian: father, relationship: "father")
    incident = create(:incident, school: school, student: pedro)

    described_class.new.up

    expect(IncidentGuardian.where(incident: incident).pluck(:name, :relationship))
      .to contain_exactly([ "Marcela Silva", "mother" ], [ "Roberto Silva", "father" ])
  end
end
