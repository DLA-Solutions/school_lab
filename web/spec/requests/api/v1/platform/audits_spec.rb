# frozen_string_literal: true

require "swagger_helper"

AUDIT_RESPONSE_SCHEMA = {
  type: :object,
  required: %w[data meta],
  properties: {
    data: {
      type: :array,
      items: {
        type: :object,
        required: %w[id action auditable_type created_at changed_keys audited_changes],
        properties: {
          id: { type: :integer },
          action: { type: :string },
          auditable_type: { type: :string },
          auditable_id: { type: :integer, nullable: true },
          school_id: { type: :integer, nullable: true },
          created_at: { type: :string, format: "date-time" },
          changed_keys: { type: :array, items: { type: :string } },
          audited_changes: { type: :object },
          actor: {
            type: :object,
            nullable: true,
            properties: {
              id: { type: :integer },
              type: { type: :string }
            }
          },
          comment: { type: :string, nullable: true }
        }
      }
    },
    meta: {
      type: :object,
      required: %w[page per_page total],
      properties: {
        page: { type: :integer },
        per_page: { type: :integer },
        total: { type: :integer }
      }
    }
  }
}.freeze

RSpec.describe "Api::V1::Platform::Audits", type: :request do
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :with_manage_backoffice_ops, user: backoffice_user) }
  let(:staff_user) { create(:user) }
  let(:school) { create(:school) }
  let!(:staff_membership) { create(:membership, :staff, user: staff_user, school: school) }

  path "/api/v1/platform/audits" do
    get "List platform audits" do
      tags "Backoffice", "Platform Audits"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :school_id, in: :query, type: :integer, required: false
      parameter name: :action, in: :query, type: :string, required: false
      parameter name: :date_from, in: :query, type: :string, required: false
      parameter name: :date_to, in: :query, type: :string, required: false

      response "200", "backoffice reads paginated audits newest first" do
        schema AUDIT_RESPONSE_SCHEMA

        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:target_school) { create(:school, name: "Audit Target") }
        let!(:school_module) do
          Schools::SeedSchoolModulesService.call(school: target_school)
          target_school.school_modules.find_by!(module_key: "billing")
        end

        before do
          Audited.store[:audited_user] = backoffice_user
          SchoolLab::BackofficeAuditMetadata.with_comment(school: target_school) do
            school_module.update!(enabled: false)
          end
        end

        after do
          Audited.store.delete(:audited_user)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          rows = body.fetch("data")
          expect(rows).not_to be_empty
          expect(rows.first.fetch("action")).to eq("update")
          expect(rows.first.fetch("school_id")).to eq(target_school.id)
          expect(body.fetch("meta")).to include("page", "per_page", "total")
        end
      end

      response "200", "audits filtered by school_id" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:school_id) { target_school.id }
        let(:target_school) { create(:school) }
        let(:other_school) { create(:school) }
        let!(:target_module) do
          Schools::SeedSchoolModulesService.call(school: target_school)
          target_school.school_modules.find_by!(module_key: "communication")
        end
        let!(:other_module) do
          Schools::SeedSchoolModulesService.call(school: other_school)
          other_school.school_modules.find_by!(module_key: "communication")
        end

        before do
          Audited.store[:audited_user] = backoffice_user
          target_module.update!(enabled: false)
          other_module.update!(enabled: false)
        end

        after do
          Audited.store.delete(:audited_user)
        end

        run_test! do |response|
          school_ids = JSON.parse(response.body).fetch("data").map { |row| row["school_id"] }.uniq
          expect(school_ids).to eq([ target_school.id ])
        end
      end

      response "200", "audits filtered by action and date_from" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:action) { "update" }
        let(:date_from) { Date.current.iso8601 }
        let(:target_school) { create(:school) }
        let!(:school_module) do
          Schools::SeedSchoolModulesService.call(school: target_school)
          target_school.school_modules.find_by!(module_key: "documents")
        end

        before do
          Audited.store[:audited_user] = backoffice_user
          school_module.update!(enabled: false)
        end

        after do
          Audited.store.delete(:audited_user)
        end

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          expect(rows).to all(include("action" => "update"))
        end
      end

      response "200", "audited_changes redact guardian email values" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:target_school) { create(:school) }
        let!(:guardian) { create(:guardian, school: target_school, email: "secret@example.com") }

        before do
          Audited.store[:audited_user] = backoffice_user
          guardian.update!(phone: "+55 11 99999-0000")
        end

        after do
          Audited.store.delete(:audited_user)
        end

        run_test! do |response|
          row = JSON.parse(response.body).fetch("data").first
          serialized = row.fetch("audited_changes").values.flatten.compact.join
          expect(serialized).not_to include("secret@example.com")
          expect(serialized).not_to include("99999")
          expect(row.fetch("changed_keys")).to include("phone")
        end
      end

      response "422", "invalid date_from" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:date_from) { "not-a-date" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
        end
      end

      response "403", "staff without backoffice role" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end
    end
  end
end
