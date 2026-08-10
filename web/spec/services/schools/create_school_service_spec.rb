# frozen_string_literal: true

require "rails_helper"

RSpec.describe Schools::CreateSchoolService do
  subject(:result) do
    described_class.call(params: params, actor: actor, owner_email: owner_email)
  end

  let(:params) { { name: "Provisioned School", cnpj: "12.345.678/0001-99" } }
  let(:actor) { nil }
  let(:owner_email) { nil }

  it "creates the school and provisions four system role templates" do
    expect(result).to be_success

    school = result.data
    expect(school).to be_persisted
    expect(school.name).to eq("Provisioned School")
    expect(school.onboarding_status).to eq("active")

    templates = school.school_role_templates.system_templates
    expect(templates.count).to eq(4)
    expect(templates.map(&:system_key)).to contain_exactly(
      "director", "secretary", "coordination", "teacher"
    )
  end

  context "when backoffice creates with owner invite" do
    let(:actor) { create(:user) }
    let!(:backoffice_membership) { create(:membership, :with_provision_school, user: actor) }
    let(:owner_email) { "owner@example.com" }
    let(:params) do
      {
        name: "Self-Serve School",
        onboarding_mode: "self_serve"
      }
    end

    it "creates pending_handoff school with invited owner" do
      expect { result }
        .to change(School, :count).by(1)
        .and have_enqueued_job(People::InviteMembershipNotificationJob)
        .and have_enqueued_job(Onboarding::SchoolProvisionedJob)

      school = result.data
      expect(school.onboarding_status).to eq("pending_handoff")
      expect(school.onboarding_mode).to eq("self_serve")

      owner_membership = school.owner_membership
      expect(owner_membership).to have_attributes(role: "staff", status: "invited")
      expect(owner_membership.staff_profile).to have_attributes(is_owner: true)
      expect(owner_membership.staff_profile.role_template.system_key).to eq("director")
      expect(owner_membership.membership_invite_tokens.count).to eq(1)
    end

    context "with white_glove mode" do
      let(:params) { super().merge(onboarding_mode: "white_glove") }

      it "starts in provisioning status" do
        expect(result).to be_success
        expect(result.data.onboarding_status).to eq("provisioning")
      end
    end

    context "without owner_email" do
      let(:owner_email) { nil }

      it "returns validation_error" do
        expect(result).to be_failure
        expect(result.error_code).to eq(:validation_error)
        expect(result.details).to include(owner_email: [ "can't be blank" ])
      end
    end
  end

  context "when actor creates the school without owner_email" do
    let(:actor) { create(:user) }

    it "grants founding membership with owner staff profile" do
      expect(result).to be_success

      school = result.data
      expect(school.onboarding_status).to eq("active")

      membership = school.memberships.find_by(user: actor)
      expect(membership).to have_attributes(role: "staff", status: "active")

      profile = membership.staff_profile
      expect(profile).to have_attributes(is_owner: true, display_title: "Diretor")
      expect(profile.role_template.system_key).to eq("director")
    end
  end

  context "when school validation fails" do
    let(:params) { { name: "" } }

    it "does not persist a school or templates" do
      expect { result }.not_to change(School, :count)
      expect { result }.not_to change(SchoolRoleTemplate, :count)
      expect { result }.not_to change(RoleTemplatePermission, :count)
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end

  context "when provisioning fails" do
    before do
      stub_const(
        "SchoolLab::Permissions::SYSTEM_TEMPLATES",
        {
          "director" => {
            default_name: "Direção",
            permissions: [
              { key: "invalid_permission", scope_kind: "full" }
            ].freeze
          }.freeze
        }.freeze
      )
    end

    it "does not leave a school behind" do
      expect { result }.not_to change(School, :count)
      expect { result }.not_to change(SchoolRoleTemplate, :count)
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end
end
