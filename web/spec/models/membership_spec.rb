# frozen_string_literal: true

require "rails_helper"

RSpec.describe Membership do
  describe "ROLES" do
    it "includes staff" do
      expect(described_class::ROLES).to include("staff")
    end
  end

  describe "#staff_member?" do
    it "returns true for school, staff, and teacher roles" do
      school = create(:school)

      expect(build(:membership, :school_admin, school: school)).to be_staff_member
      expect(build(:membership, :staff, school: school)).to be_staff_member
      expect(build(:membership, role: "teacher", school: school)).to be_staff_member
    end

    it "returns false for guardian and backoffice roles" do
      expect(build(:membership, role: "guardian")).not_to be_staff_member
      expect(build(:membership, :backoffice)).not_to be_staff_member
    end
  end
end
