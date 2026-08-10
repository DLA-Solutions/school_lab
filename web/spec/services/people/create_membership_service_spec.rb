# frozen_string_literal: true

require "rails_helper"

RSpec.describe People::CreateMembershipService do
  include ActiveJob::TestHelper

  subject(:result) { described_class.call(school: school, params: params) }

  let(:school) { create(:school) }
  let!(:templates) { create_system_templates_for(school) }
  let(:secretary_template) { templates.find { |t| t.system_key == "secretary" } }
  let(:teacher_template) { templates.find { |t| t.system_key == "teacher" } }
  let(:coordination_template) { templates.find { |t| t.system_key == "coordination" } }

  describe "staff with role template" do
    let(:params) do
      {
        email: "secretary@example.com",
        role: "staff",
        role_template_id: secretary_template.id,
        display_title: "Secretária"
      }
    end

    it "creates invited membership and staff profile" do
      expect(result).to be_success

      membership = result.data
      expect(membership).to have_attributes(role: "staff", status: "invited")
      expect(membership.staff_profile).to have_attributes(
        role_template_id: secretary_template.id,
        display_title: "Secretária",
        is_owner: false,
        also_teaches: false
      )
    end

    it "enqueues invite notification job" do
      expect { result }.to have_enqueued_job(People::InviteMembershipNotificationJob)
    end
  end

  describe "teacher with teacher template" do
    let(:params) do
      {
        email: "teacher@example.com",
        role: "teacher",
        role_template_id: teacher_template.id
      }
    end

    it "creates profile with also_teaches false" do
      expect(result).to be_success
      expect(result.data.staff_profile).to have_attributes(
        role_template_id: teacher_template.id,
        also_teaches: false
      )
    end
  end

  describe "staff with coordination template" do
    let(:params) do
      {
        email: "coord@example.com",
        role: "staff",
        role_template_id: coordination_template.id
      }
    end

    it "sets also_teaches true" do
      expect(result).to be_success
      expect(result.data.staff_profile.also_teaches).to be(true)
    end
  end

  describe "staff without role_template_id" do
    let(:params) { { email: "staff@example.com", role: "staff" } }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to include(role_template_id: [ "can't be blank" ])
    end
  end

  describe "cross-school role template" do
    let(:other_school) { create(:school) }
    let!(:other_templates) { create_system_templates_for(other_school) }
    let(:foreign_template) { other_templates.find { |t| t.system_key == "secretary" } }
    let(:params) do
      {
        email: "staff@example.com",
        role: "staff",
        role_template_id: foreign_template.id
      }
    end

    it "returns not_found" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:not_found)
    end
  end

  describe "teacher template with staff role" do
    let(:params) do
      {
        email: "mismatch@example.com",
        role: "staff",
        role_template_id: teacher_template.id
      }
    end

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to include(role_template_id: [ "requires role teacher" ])
    end
  end

  describe "guardian without template" do
    let(:params) { { email: "guardian@example.com", role: "guardian" } }

    it "creates membership without staff profile" do
      expect(result).to be_success
      expect(result.data.staff_profile).to be_nil
    end
  end

  describe "segment from another school" do
    let(:other_school) { create(:school) }
    let(:foreign_segment) { create(:segment, school: other_school) }
    let(:params) do
      {
        email: "staff@example.com",
        role: "staff",
        role_template_id: secretary_template.id,
        segment_id: foreign_segment.id
      }
    end

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to include(segment_id: [ "is invalid" ])
    end
  end

  describe "role school" do
    let(:params) { { email: "admin@example.com", role: "school" } }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to include(role: [ "is not assignable via invite" ])
    end
  end
end
