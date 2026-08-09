# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::ResolveEffectivePermissionsService do
  subject(:result) { described_class.call(membership: membership) }

  let(:school) { create(:school) }
  let(:user) { create(:user) }

  def keys
    result.data[:keys]
  end

  def sources
    result.data[:sources]
  end

  context "when membership is guardian" do
    let(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    it "returns empty keys" do
      expect(result).to be_success
      expect(keys).to eq([])
      expect(sources).to eq({})
    end
  end

  context "when membership is backoffice" do
    let(:membership) { create(:membership, :backoffice, user: user) }

    it "returns empty keys" do
      expect(result).to be_success
      expect(keys).to eq([])
      expect(sources).to eq({})
    end
  end

  context "when staff membership has no kept staff profile" do
    let(:membership) { create(:membership, :staff, user: user, school: school) }

    it "returns empty keys" do
      expect(result).to be_success
      expect(keys).to eq([])
      expect(sources).to eq({})
    end
  end

  context "when membership is owner" do
    let(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:director_template) { create_system_templates_for(school).find { |t| t.system_key == "director" } }

    before do
      create(:staff_profile, :owner, membership: membership, school: school, role_template: director_template)
    end

    it "includes the full staff catalog except teach by default" do
      expect(result).to be_success
      expect(keys).to eq(SchoolLab::Permissions.staff_keys.reject { |key| key == "teach" }.sort)
      expect(sources.values).to all(eq("owner"))
      expect(keys).to include("manage_billing", "manage_people")
      expect(keys).not_to include("teach")
    end

    context "when also_teaches is true" do
      before do
        membership.staff_profile.update!(also_teaches: true)
      end

      it "includes teach" do
        expect(keys).to include("teach")
        expect(sources["teach"]).to eq("owner")
      end
    end

    context "when membership role is teacher" do
      before do
        membership.update!(role: "teacher")
      end

      it "includes teach" do
        expect(keys).to include("teach")
        expect(sources["teach"]).to eq("owner")
      end
    end

    context "when teach is granted via override" do
      before do
        create(:membership_permission, membership: membership, school: school, permission_key: "teach", effect: "grant")
      end

      it "includes teach with grant source" do
        expect(keys).to include("teach")
        expect(sources["teach"]).to eq("grant")
      end
    end
  end

  context "when membership uses a role template" do
    let(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:templates) { create_system_templates_for(school) }
    let(:secretary_template) { templates.find { |t| t.system_key == "secretary" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
    end

    it "returns template permission keys" do
      expect(result).to be_success
      expect(keys).to include("manage_people", "manage_enrollment", "manage_documents")
      expect(keys).not_to include("manage_billing")
      expect(sources["manage_people"]).to eq("template")
    end

    it "keeps a grant override for a key missing from the template" do
      create(:membership_permission, membership: membership, school: school, permission_key: "manage_billing", effect: "grant")

      expect(keys).to include("manage_billing")
      expect(sources["manage_billing"]).to eq("grant")
    end

    it "removes a template key when denied by override" do
      create(:membership_permission, membership: membership, school: school, permission_key: "manage_people", effect: "deny")

      expect(keys).not_to include("manage_people")
    end
  end

  context "when coordination template has teach without also_teaches" do
    let(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:coordination_template) { create_system_templates_for(school).find { |t| t.system_key == "coordination" } }

    before do
      create(
        :staff_profile,
        membership: membership,
        school: school,
        role_template: coordination_template,
        also_teaches: false
      )
    end

    it "does not include teach" do
      expect(keys).not_to include("teach")
    end
  end

  context "when membership is discarded" do
    let(:membership) do
      create(:membership, :staff, user: user, school: school).tap(&:discard)
    end

    it "returns empty keys" do
      expect(keys).to eq([])
      expect(sources).to eq({})
    end
  end

  describe ".allows?" do
    let(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
    end

    it "returns true when the key is effective" do
      expect(described_class.allows?(membership: membership, permission_key: "manage_people")).to be(true)
    end

    it "returns false when the key is not effective" do
      expect(described_class.allows?(membership: membership, permission_key: "manage_billing")).to be(false)
    end
  end
end
