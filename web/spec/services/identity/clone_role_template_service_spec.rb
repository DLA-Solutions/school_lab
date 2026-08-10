# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::CloneRoleTemplateService do
  subject(:result) { described_class.call(source_template: source_template, name: "Secretaria Cópia") }

  let(:school) { create(:school) }
  let(:source_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

  it "creates a custom copy with the same permissions" do
    expect(result).to be_success

    clone = result.data
    expect(clone).to be_persisted
    expect(clone.is_system).to be(false)
    expect(clone.system_key).to be_nil
    expect(clone.name).to eq("Secretaria Cópia")

    source_keys = source_template.role_template_permissions.kept.map do |permission|
      [ permission.permission_key, permission.scope_kind ]
    end
    clone_keys = clone.role_template_permissions.kept.map do |permission|
      [ permission.permission_key, permission.scope_kind ]
    end
    expect(clone_keys).to match_array(source_keys)
  end
end
