# frozen_string_literal: true

require "rails_helper"

RSpec.describe StudentPolicy do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: user) }

  after { Current.reset }

  describe "#show?" do
    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.guardian = guardian
      Current.effective_permission_keys = nil
    end

    it "permits a student with a kept guardian link" do
      student = create(:student, school: school)
      create(:student_guardian, school: school, student: student, guardian: guardian)

      expect(described_class.new(user, student).show?).to be(true)
    end

    it "denies a student whose only guardian link is discarded" do
      student = create(:student, school: school)
      link = create(:student_guardian, school: school, student: student, guardian: guardian)
      link.discard!

      expect(described_class.new(user, student).show?).to be(false)
    end
  end

  describe "Scope" do
    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.guardian = guardian
      Current.effective_permission_keys = nil
    end

    it "includes a student with a kept link and omits one whose only link is discarded" do
      linked = create(:student, school: school, name: "Linked Child")
      former = create(:student, school: school, name: "Former Child")
      create(:student_guardian, school: school, student: linked, guardian: guardian)
      discarded_link = create(:student_guardian, school: school, student: former, guardian: guardian)
      discarded_link.discard!

      resolved = described_class::Scope.new(user, Student.all).resolve

      expect(resolved).to contain_exactly(linked)
    end

    it "omits a discarded student even when the guardian link is kept" do
      archived = create(:student, school: school)
      create(:student_guardian, school: school, student: archived, guardian: guardian)
      archived.discard!

      resolved = described_class::Scope.new(user, Student.all).resolve

      expect(resolved).to be_empty
    end
  end
end
