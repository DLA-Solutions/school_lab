# frozen_string_literal: true

require "rails_helper"

RSpec.describe DailyRoutineEntries::SendDailyRoutineEntryService do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school) }
  let(:entry) { create(:daily_routine_entry, school: school, student: student) }
  let(:membership) { create(:membership, :staff, school: school) }

  subject(:result) { described_class.call(entry: entry, sent_by_membership: membership) }

  it "transitions draft to sent and stamps sent_at/sent_by_membership_id" do
    expect(result).to be_success
    expect(entry.reload).to be_sent
    expect(entry.sent_at).to be_present
    expect(entry.sent_by_membership).to eq(membership)
  end

  it "emits the DailyRoutineSent event exactly once on the real transition" do
    expect(DailyRoutineEntries::EventEmitter).to receive(:routine_sent).with(entry: entry).once

    result
  end

  it "enqueues the notification job exactly once on the real transition" do
    expect { result }.to have_enqueued_job(DailyRoutineEntries::RoutineSentJob).once
  end

  # BR-DR04/AC-DR04: idempotent — calling send again on an already-sent entry is a no-op success.
  context "when the entry is already sent" do
    let(:entry) do
      create(:daily_routine_entry, :sent, school: school, student: student, sent_at: 2.days.ago)
    end

    it "returns success without changing the existing sent_at" do
      original_sent_at = entry.sent_at

      expect(result).to be_success
      expect(entry.reload.sent_at).to be_within(1.second).of(original_sent_at)
    end

    it "does not emit a second DailyRoutineSent event" do
      expect(DailyRoutineEntries::EventEmitter).not_to receive(:routine_sent)

      result
    end

    it "does not enqueue a second notification job" do
      expect { result }.not_to have_enqueued_job(DailyRoutineEntries::RoutineSentJob)
    end
  end
end
