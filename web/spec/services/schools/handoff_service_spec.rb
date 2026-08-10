# frozen_string_literal: true

require "rails_helper"

RSpec.describe Schools::HandoffService do
  subject(:result) { described_class.call(school: school, actor: actor, params: params) }

  let(:actor) { create(:user) }
  let(:params) { {} }

  describe "provisioning to pending_handoff" do
    let(:school) { create(:school, :provisioning) }
    let!(:owner_user) { create(:user, email: "owner@example.com") }
    let!(:owner_membership) do
      create(:membership, :invited, :staff, user: owner_user, school: school).tap do |membership|
        director = create_system_templates_for(school).find { |t| t.system_key == "director" }
        create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
        Identity::IssueMembershipInviteTokenService.call(membership: membership, inviter: actor)
      end
    end

    before do
      school.update!(billing_waived_at: Time.current)
    end

    it "transitions white_glove school to pending_handoff" do
      expect { result }
        .to change { school.reload.onboarding_status }.from("provisioning").to("pending_handoff")
        .and have_enqueued_job(Onboarding::SchoolHandedOffJob)

      expect(result).to be_success
    end

    context "when checklist is incomplete" do
      before { school.update!(billing_waived_at: nil) }

      it "returns validation_error with checklist details" do
        expect(result).to be_failure
        expect(result.error_code).to eq(:validation_error)
        expect(result.details[:checklist]).to include("billing")
      end
    end
  end

  describe "pending_handoff to active" do
    let(:school) { create(:school, :pending_handoff, onboarding_mode: "self_serve") }
    let(:owner_user) { create(:user) }
    let!(:owner_membership) do
      create(:membership, :staff, user: owner_user, school: school, status: "active").tap do |membership|
        director = create_system_templates_for(school).find { |t| t.system_key == "director" }
        create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
      end
    end

    before do
      create(:school_payment_provider, school: school, active: true)
    end

    it "activates the school and emits owner activated event" do
      expect { result }
        .to change { school.reload.onboarding_status }.from("pending_handoff").to("active")
        .and have_enqueued_job(Onboarding::SchoolHandedOffJob)
        .and have_enqueued_job(Onboarding::OwnerActivatedJob)

      expect(result).to be_success
    end

    context "when owner is still invited" do
      before { owner_membership.update!(status: "invited") }

      it "returns validation_error" do
        expect(result).to be_failure
        expect(result.details[:checklist]).to include("owner_active")
      end
    end
  end
end
