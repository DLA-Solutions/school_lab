# frozen_string_literal: true

require "rails_helper"

RSpec.describe DocumentPolicy do
  subject(:policy) { described_class.new(user, Document) }

  let(:school) { create(:school) }
  let(:user) { create(:user) }

  before do
    Current.user = user
    Current.school = school
    Current.membership = membership
    Current.guardian = guardian
  end

  after { Current.reset }

  context "with a guardian" do
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
    let!(:guardian) { create(:guardian, school: school, user: user) }

    it "may send family documents and list them, but not use the staff create" do
      expect(policy.create_family_document?).to be(true)
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(false)
    end
  end

  context "with a school admin" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }
    let(:guardian) { nil }

    it "keeps the staff create and has no guardian upload" do
      expect(policy.create?).to be(true)
      expect(policy.create_family_document?).to be(false)
    end

    it "may review, and discard, a document a parent sent for a child" do
      student = create(:student, school: school)
      document = create(:document, school: school, documentable: student, uploaded_by: create(:user))
      record_policy = described_class.new(user, document)

      expect(record_policy.show?).to be(true)
      expect(record_policy.approve?).to be(true)
      expect(record_policy.reject?).to be(true)
      expect(record_policy.destroy?).to be(true)
    end

    it "may not act on a document of another school" do
      foreign = create(:document)

      expect(described_class.new(user, foreign).approve?).to be(false)
      expect(DocumentPolicy::Scope.new(user, Document).resolve).not_to include(foreign)
    end
  end

  describe "inactivating a document (BR-ARC14)" do
    let(:guardian) { nil }
    let(:student) { create(:student, school: school) }
    let(:document) { create(:document, school: school, documentable: student) }
    let(:record_policy) { described_class.new(user, document) }

    def staff_membership_with(system_key)
      membership = create(:membership, :staff, user: user, school: school)
      template = create_system_templates_for(school).find { |t| t.system_key == system_key }
      create(:staff_profile, membership: membership, school: school, role_template: template)
      membership
    end

    %w[director secretary coordination].each do |system_key|
      context "with #{system_key}" do
        let!(:membership) { staff_membership_with(system_key) }

        it "may inactivate and list inactive documents" do
          expect(record_policy.destroy?).to be(true)
          expect(record_policy.list_inactive?).to be(true)
        end
      end
    end

    context "with teacher (no manage_documents)" do
      let!(:membership) { staff_membership_with("teacher") }

      it "may not inactivate nor list inactive documents" do
        expect(record_policy.destroy?).to be(false)
        expect(record_policy.list_inactive?).to be(false)
        expect(DocumentPolicy::Scope.new(user, Document).resolve_inactive).to be_empty
      end
    end

    context "with a guardian" do
      let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
      let(:guardian) { create(:guardian, school: school, user: user) }
      let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }

      it "may not inactivate, list inactive ones, nor see an inactivated document" do
        document.discard

        expect(record_policy.destroy?).to be(false)
        expect(record_policy.list_inactive?).to be(false)
        expect(record_policy.show?).to be(false)
        expect(DocumentPolicy::Scope.new(user, Document).resolve).not_to include(document)
        expect(DocumentPolicy::Scope.new(user, Document).resolve_inactive).to be_empty
      end
    end

    context "with a school admin" do
      let!(:membership) { create(:membership, :school_admin, user: user, school: school) }

      it "splits kept and inactive documents between the two scopes, within the school only" do
        inactive = create(:document, school: school, documentable: student).tap(&:discard)
        foreign_inactive = create(:document).tap(&:discard)

        scope = DocumentPolicy::Scope.new(user, Document)
        expect(scope.resolve).to contain_exactly(document)
        expect(scope.resolve_inactive).to contain_exactly(inactive)
        expect(scope.resolve_inactive).not_to include(foreign_inactive)
      end
    end
  end
end
