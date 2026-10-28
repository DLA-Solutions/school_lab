# frozen_string_literal: true

require "rails_helper"

RSpec.describe People::DiscardStudentGuardianService do
  subject(:result) { described_class.call(link: link) }

  let(:school) { create(:school) }
  let(:student) { create(:student, school: school) }

  context "when it is the student's only kept guardian link" do
    let(:link) { create(:student_guardian, school: school, student: student) }

    it "rejects the discard and leaves the link kept" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:student_requires_a_guardian)
      expect(link.reload).not_to be_discarded
    end
  end

  context "when the student has another kept guardian link" do
    let(:link) { create(:student_guardian, school: school, student: student, relationship: "father") }

    before do
      create(:student_guardian, school: school, student: student, relationship: "mother")
    end

    it "discards the link" do
      expect(result).to be_success
      expect(link.reload).to be_discarded
    end
  end

  context "when the link is already discarded" do
    let(:link) { create(:student_guardian, school: school, student: student, discarded_at: Time.current) }

    it "returns the existing invalid_state_transition failure" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_state_transition)
    end
  end
end
