# frozen_string_literal: true

require "rails_helper"
require Rails.root.join("db/migrate/20261023011629_grant_manage_documents_to_coordination_templates.rb")

# Schools provisioned before Coordenação held `manage_documents` get the new default; a school
# that already decided (kept or discarded row) is left alone. Exercised directly against fresh
# fixtures, independent of what the database held when the migration first ran.
RSpec.describe GrantManageDocumentsToCoordinationTemplates do
  def coordination_of(school)
    school.school_role_templates.kept.find_by!(system_key: "coordination")
  end

  def legacy_school
    create(:school).tap do |school|
      create_system_templates_for(school)
      RoleTemplatePermission.where(role_template: coordination_of(school), permission_key: "manage_documents").delete_all
    end
  end

  it "grants manage_documents (full) to the coordination template of an older school" do
    school = legacy_school

    described_class.new.up

    grant = coordination_of(school).role_template_permissions.kept.find_by(permission_key: "manage_documents")
    expect(grant).to have_attributes(scope_kind: "full", school_id: school.id)
  end

  it "is idempotent and does not duplicate the grant" do
    school = legacy_school

    described_class.new.up
    expect { described_class.new.up }.not_to change(RoleTemplatePermission, :count)

    expect(coordination_of(school).role_template_permissions.where(permission_key: "manage_documents").count).to eq(1)
  end

  it "leaves other templates and schools' own decisions alone" do
    school = legacy_school
    coordination_of(school).role_template_permissions.create!(
      school: school, permission_key: "manage_documents", scope_kind: "full"
    ).discard
    teacher = school.school_role_templates.kept.find_by!(system_key: "teacher")

    expect { described_class.new.up }.not_to change(RoleTemplatePermission, :count)
    expect(teacher.role_template_permissions.kept.pluck(:permission_key)).to eq([ "teach" ])
  end

  it "does not touch custom (non-system) templates named coordination" do
    school = legacy_school
    custom = create(:school_role_template, school: school, name: "Coordenação", system_key: nil)

    described_class.new.up

    expect(custom.role_template_permissions).to be_empty
  end

  it "reverts to the previous default on down" do
    school = legacy_school
    described_class.new.up

    described_class.new.down

    expect(coordination_of(school).role_template_permissions.kept.pluck(:permission_key)).not_to include("manage_documents")
  end
end
