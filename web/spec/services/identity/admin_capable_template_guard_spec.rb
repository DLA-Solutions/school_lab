# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::AdminCapableTemplateGuard do
  subject(:result) do
    described_class.call(
      school: school,
      template: template,
      proposed_permission_keys: proposed_keys
    )
  end

  let(:school) { create(:school) }
  let(:templates) { create_system_templates_for(school) }
  let(:director) { templates.find { |t| t.system_key == "director" } }
  let(:secretary) { templates.find { |t| t.system_key == "secretary" } }

  context "when another admin-capable template remains after the change" do
    let(:template) { secretary }
    let(:proposed_keys) { %w[manage_people] }

    it "allows the change" do
      expect(result).to be_success
    end
  end

  context "when the change would remove the last admin-capable template" do
    let(:template) { director }
    let(:proposed_keys) { %w[manage_people manage_billing] }

    it "rejects the change" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:last_admin_template)
    end
  end

  context "when the proposed keys keep the template admin-capable" do
    let(:template) { director }
    let(:proposed_keys) { %w[manage_people manage_school_settings manage_billing] }

    it "allows the change" do
      expect(result).to be_success
    end
  end
end
