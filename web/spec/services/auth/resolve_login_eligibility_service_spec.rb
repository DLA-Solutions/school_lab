# frozen_string_literal: true

require "rails_helper"

RSpec.describe Auth::ResolveLoginEligibilityService do
  subject(:result) { described_class.call(user: user) }

  context "when staff membership is active" do
    let(:user) { create(:user) }

    before { create(:membership, :staff, user: user) }

    it { is_expected.to be_success }
  end

  context "when staff membership is invited" do
    let(:user) { create(:user) }

    before { create(:membership, :staff, :invited, user: user) }

    it { is_expected.to be_success }
  end

  context "when only suspended staff membership exists" do
    let(:user) { create(:user) }

    before { create(:membership, :staff, :suspended, user: user) }

    it "denies login generically" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:access_denied)
    end
  end

  context "when guardian has an enrolled child" do
    let(:user) { create(:user) }
    let(:school) { create(:school) }
    let(:guardian) { create(:guardian, school: school, user: user) }
    let(:student) { create(:student, school: school, status: "active") }

    before do
      create(:membership, user: user, school: school, role: "guardian", status: "active")
      create(:student_guardian, school: school, student: student, guardian: guardian)
    end

    it { is_expected.to be_success }
  end

  context "when guardian profile is discarded" do
    let(:user) { create(:user) }
    let(:school) { create(:school) }
    let(:guardian) { create(:guardian, school: school, user: user, discarded_at: Time.current) }
    let(:student) { create(:student, school: school, status: "active") }

    before do
      create(:membership, user: user, school: school, role: "guardian", status: "active")
      create(:student_guardian, school: school, student: student, guardian: guardian)
    end

    it "denies login generically" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:access_denied)
    end
  end

  context "when guardian has no enrolled child" do
    let(:user) { create(:user) }
    let(:school) { create(:school) }
    let(:guardian) { create(:guardian, school: school, user: user) }
    let(:student) { create(:student, school: school, status: "transferred") }

    before do
      create(:membership, user: user, school: school, role: "guardian", status: "active")
      create(:student_guardian, school: school, student: student, guardian: guardian)
    end

    it "denies login generically" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:access_denied)
    end
  end

  context "when user has both staff and guardian paths" do
    let(:user) { create(:user) }
    let(:school) { create(:school) }

    before do
      create(:membership, :staff, user: user, school: school)
      create(:membership, user: user, school: school, role: "guardian", status: "suspended")
    end

    it { is_expected.to be_success }
  end

  context "when user is disabled" do
    let(:user) { create(:user, :disabled) }

    before { create(:membership, user: user) }

    it "returns user_disabled" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:user_disabled)
    end
  end
end
