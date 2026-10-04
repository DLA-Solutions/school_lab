# frozen_string_literal: true

require "rails_helper"

RSpec.describe DailyRoutineEntries::UpsertDailyRoutineEntryService do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school) }
  let(:date) { Date.current }
  let(:membership) { create(:membership, :staff, school: school) }

  subject(:result) do
    described_class.call(
      student: student, date: date, attributes: attributes, recorded_by_membership: membership
    )
  end

  let(:attributes) { { snack_eaten: true, poop_count: 1, pee_count: 3, notes: "Dormiu bem." } }

  it "creates a new draft entry with the given fields" do
    expect(result).to be_success
    entry = result.data
    expect(entry).to be_persisted
    expect(entry).to be_draft
    expect(entry.snack_eaten).to be(true)
    expect(entry.poop_count).to eq(1)
    expect(entry.pee_count).to eq(3)
    expect(entry.notes).to eq("Dormiu bem.")
    expect(entry.recorded_by_membership).to eq(membership)
    expect(entry.school).to eq(school)
  end

  it "updates the existing row in place on a second call for the same pair (BR-DR01)" do
    first = described_class.call(student: student, date: date, attributes: { poop_count: 1 })
    expect(first).to be_success

    second = described_class.call(student: student, date: date, attributes: { poop_count: 2 })

    expect(second).to be_success
    expect(DailyRoutineEntry.count).to eq(1)
    expect(second.data.id).to eq(first.data.id)
    expect(second.data.reload.poop_count).to eq(2)
  end

  it "allows an empty attributes hash" do
    empty_result = described_class.call(student: student, date: date, attributes: {})

    expect(empty_result).to be_success
    expect(empty_result.data).to be_persisted
    expect(empty_result.data.poop_count).to eq(0)
  end

  # BR-DR04: an upsert never reverts a `sent` entry back to draft, and never touches status.
  it "leaves a sent entry's status untouched on a later edit" do
    existing = create(:daily_routine_entry, :sent, school: school, student: student, date: date)

    edited = described_class.call(student: student, date: date, attributes: { notes: "Edit after send" })

    expect(edited).to be_success
    expect(edited.data.id).to eq(existing.id)
    expect(edited.data.reload).to be_sent
    expect(edited.data.notes).to eq("Edit after send")
  end

  it "fails with validation_error for a negative poop_count" do
    bad_result = described_class.call(student: student, date: date, attributes: { poop_count: -1 })

    expect(bad_result).to be_failure
    expect(bad_result.error_code).to eq(:validation_error)
    expect(bad_result.details[:poop_count]).to be_present
  end

  it "does not persist a record on validation failure" do
    expect do
      described_class.call(student: student, date: date, attributes: { poop_count: -1 })
    end.not_to change(DailyRoutineEntry, :count)
  end
end
