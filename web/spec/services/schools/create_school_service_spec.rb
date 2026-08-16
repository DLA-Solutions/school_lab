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

    expect(school.school_modules.pluck(:module_key, :enabled)).to contain_exactly(
      [ "communication", true ],
      [ "academic", true ],
      [ "billing", true ],
      [ "documents", true ]
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

        modules = result.data.school_modules.order(:module_key)
        expect(modules.pluck(:module_key)).to eq(SchoolLab::SchoolModuleKeys.keys.sort)
        expect(modules).to all(have_attributes(enabled: true))
      end
    end

    context "with module overrides" do
      let(:params) { super().merge(onboarding_mode: "white_glove") }
      let(:modules) { { billing: false, communication: true } }

      subject(:result) do
        described_class.call(params: params, actor: actor, owner_email: owner_email, modules: modules)
      end

      it "seeds defaults with partial overrides applied" do
        expect(result).to be_success

        by_key = result.data.school_modules.index_by(&:module_key)
        expect(by_key.fetch("billing").enabled).to be(false)
        expect(by_key.fetch("communication").enabled).to be(true)
        expect(by_key.fetch("academic").enabled).to be(true)
        expect(by_key.fetch("documents").enabled).to be(true)
      end
    end

    context "with unknown module keys" do
      let(:modules) { { unknown_module: true } }

      subject(:result) do
        described_class.call(params: params, actor: actor, owner_email: owner_email, modules: modules)
      end

      it "does not create the school" do
        expect { result }.not_to change(School, :count)
        expect { result }.not_to change(SchoolModule, :count)
        expect(result).to be_failure
        expect(result.error_code).to eq(:validation_error)
        expect(result.details[:modules]).to include("unknown_module is not a valid module key")
      end
    end

    context "when module seeding is retried idempotently" do
      let(:school) { create(:school) }

      it "does not duplicate rows" do
        first = Schools::SeedSchoolModulesService.call(school: school)
        second = Schools::SeedSchoolModulesService.call(school: school, overrides: { billing: false })

        expect(first).to be_success
        expect(second).to be_success
        expect(school.school_modules.count).to eq(4)
        expect(school.school_modules.find_by(module_key: "billing").enabled).to be(false)
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
