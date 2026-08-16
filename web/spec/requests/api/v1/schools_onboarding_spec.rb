# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools onboarding", type: :request do
  include ActiveJob::TestHelper

  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :with_provision_school, user: backoffice_user) }
  let(:owner_user) { create(:user) }

  path "/api/v1/schools" do
    post "Create school with onboarding" do
      tags "Backoffice"
      description "Backoffice actors must include school.owner_email; school staff may omit it when opening their own school."
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          school: {
            type: :object,
            properties: {
              name: { type: :string },
              cnpj: { type: :string },
              address: { type: :string },
              saas_plan: { type: :string },
              school_group_id: { type: :integer },
              onboarding_mode: { type: :string, enum: %w[self_serve white_glove] },
              owner_email: {
                type: :string,
                format: :email,
                description: "Required for backoffice provisioning; omit when a school admin opens their own school."
              }
            },
            required: %w[name]
          },
          modules: {
            type: :object,
            description: "Optional partial overrides for MVP module flags; omitted keys keep defaults (all enabled).",
            properties: {
              communication: { type: :boolean },
              academic: { type: :boolean },
              billing: { type: :boolean },
              documents: { type: :boolean }
            }
          }
        },
        required: %w[school]
      }

      response "201", "self-serve school created with owner invite" do
        around do |example|
          original_token = ENV["POSTMARK_API_TOKEN"]
          ENV.delete("POSTMARK_API_TOKEN")
          example.run
        ensure
          ENV["POSTMARK_API_TOKEN"] = original_token
        end

        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) do
          {
            school: {
              name: "Self Serve School",
              onboarding_mode: "self_serve",
              owner_email: "director@example.com"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("pending_handoff")
          expect(body.dig("data", "onboarding_mode")).to eq("self_serve")
          expect(body.dig("meta", "owner_invite_email_status")).to eq("not_configured")

          school = School.find(body.dig("data", "id"))
          owner = school.owner_membership
          expect(owner.status).to eq("invited")
          expect(owner.staff_profile.is_owner).to be(true)
          expect(owner.membership_invite_tokens.count).to eq(1)
        end
      end

      response "201", "backoffice white-glove school created with onboarding_status provisioning (owner_email required)" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) do
          {
            school: {
              name: "Premium School",
              onboarding_mode: "white_glove",
              owner_email: "director@premium.example"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("provisioning")
        end
      end

      response "422", "missing owner_email for backoffice" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) { { school: { name: "No Owner School" } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details", "owner_email")).to be_present
        end
      end
    end
  end

  path "/api/v1/schools/{id}/handoff" do
    parameter name: :id, in: :path, type: :integer

    post "Hand off school onboarding" do
      tags "Backoffice"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          handoff: {
            type: :object,
            properties: {
              billing_waived: { type: :boolean }
            }
          }
        }
      }

      response "200", "owner activates self-serve school" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "self_serve") }
        let(:id) { school.id }
        let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }
        let!(:owner_membership) do
          create(:membership, :staff, user: owner_user, school: school, status: "active").tap do |membership|
            director = create_system_templates_for(school).find { |t| t.system_key == "director" }
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
        end
        let(:payload) { { handoff: { billing_waived: true } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("active")
        end
      end

      response "403", "non-owner staff cannot handoff self-serve school" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "self_serve") }
        let(:id) { school.id }
        let(:staff_user) { create(:user) }
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }
        let!(:staff_membership) do
          create(:membership, :staff, user: staff_user, school: school, status: "active").tap do |membership|
            secretary = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
            create(:staff_profile, membership: membership, school: school, role_template: secretary)
          end
        end
        let(:payload) { { handoff: { billing_waived: true } } }

        before do
          create(:school_payment_provider, school: school, active: true)
          owner = create(:user)
          create(:membership, :staff, user: owner, school: school, status: "active").tap do |membership|
            director = school.system_role_template("director")
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "422", "incomplete activation checklist" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "self_serve") }
        let(:id) { school.id }
        let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }
        let!(:owner_membership) do
          create(:membership, :staff, user: owner_user, school: school, status: "active").tap do |membership|
            director = create_system_templates_for(school).find { |t| t.system_key == "director" }
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
        end
        let(:payload) { {} }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details", "checklist")).to include("billing")
        end
      end

      response "200", "provisioning handoff for white-glove school" do
        let(:school) { create(:school, :provisioning) }
        let(:id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) { { handoff: { billing_waived: true } } }

        before do
          owner = create(:user, email: "owner@whiteglove.example")
          membership = create(:membership, :invited, :staff, user: owner, school: school)
          director = create_system_templates_for(school).find { |t| t.system_key == "director" }
          create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          Identity::IssueMembershipInviteTokenService.call(membership: membership, inviter: backoffice_user)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("pending_handoff")
        end
      end

      response "200", "backoffice activates white-glove school after owner accepts" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "white_glove") }
        let(:id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) { {} }

        before do
          owner = create(:user, email: "owner@whiteglove-active.example")
          create(:membership, :staff, user: owner, school: school, status: "active").tap do |membership|
            director = create_system_templates_for(school).find { |t| t.system_key == "director" }
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
          create(:school_payment_provider, school: school, active: true)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("active")
        end
      end

      response "422", "activation blocked when owner is not active" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "white_glove") }
        let(:id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) { {} }

        before do
          owner = create(:user, email: "invited@whiteglove.example")
          create(:membership, :invited, :staff, user: owner, school: school).tap do |membership|
            director = create_system_templates_for(school).find { |t| t.system_key == "director" }
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
          school.update!(billing_waived_at: Time.current)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details", "checklist")).to include("owner_active")
        end
      end

      response "403", "backoffice cannot activate self-serve school" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "self_serve") }
        let(:id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) { { handoff: { billing_waived: true } } }

        before do
          owner = create(:user, email: "owner@selfserve.example")
          create(:membership, :staff, user: owner, school: school, status: "active").tap do |membership|
            director = create_system_templates_for(school).find { |t| t.system_key == "director" }
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "school staff without backoffice cannot handoff" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "white_glove") }
        let(:id) { school.id }
        let(:staff_user) { create(:user) }
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }
        let(:payload) { {} }

        before do
          secretary = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
          create(:membership, :staff, user: staff_user, school: school, status: "active").tap do |membership|
            create(:staff_profile, membership: membership, school: school, role_template: secretary)
          end
          owner = create(:user, email: "owner@staff-denied.example")
          create(:membership, :staff, user: owner, school: school, status: "active").tap do |membership|
            director = school.system_role_template("director")
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
          create(:school_payment_provider, school: school, active: true)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/people/memberships" do
    parameter name: :school_id, in: :path, type: :integer

    post "Create membership during provisioning" do
      tags "People"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          membership: {
            type: :object,
            properties: {
              email: { type: :string },
              role: { type: :string },
              role_template_id: { type: :integer }
            },
            required: %w[email role role_template_id]
          }
        },
        required: %w[membership]
      }

      response "201", "backoffice with provision_school creates membership" do
        let(:school) { create(:school, :provisioning) }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
        let(:payload) do
          {
            membership: {
              email: "secretary@example.com",
              role: "staff",
              role_template_id: secretary_template.id
            }
          }
        end

        run_test!
      end

      response "403", "backoffice without provision_school forbidden" do
        let(:school) { create(:school, :provisioning) }
        let(:school_id) { school.id }
        let(:plain_backoffice) { create(:user) }
        let!(:plain_membership) { create(:membership, :backoffice, user: plain_backoffice) }
        let(:Authorization) { auth_headers_for(plain_backoffice)["Authorization"] }
        let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
        let(:payload) do
          {
            membership: {
              email: "secretary@example.com",
              role: "staff",
              role_template_id: secretary_template.id
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "backoffice blocked on active school" do
        let(:school) { create(:school, onboarding_status: "active") }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
        let(:payload) do
          {
            membership: {
              email: "secretary@example.com",
              role: "staff",
              role_template_id: secretary_template.id
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "backoffice blocked on pending_handoff school" do
        let(:school) { create(:school, :pending_handoff) }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
        let(:payload) do
          {
            membership: {
              email: "secretary@example.com",
              role: "staff",
              role_template_id: secretary_template.id
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/people/memberships/{id}/invite" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Resend invite during provisioning" do
      tags "People"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "backoffice with provision_school resends invite" do
        let(:school) { create(:school, :provisioning) }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:invitee) { create(:user, email: "secretary@example.com") }
        let!(:membership) { create(:membership, :invited, :staff, user: invitee, school: school) }
        let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
        let!(:staff_profile) do
          create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
        end
        let!(:existing_token) { create(:membership_invite_token, membership: membership) }
        let(:id) { membership.id }

        run_test! do
          expect(existing_token.reload.used_at).to be_present
          expect(membership.membership_invite_tokens.unused.count).to eq(1)
          expect(People::InviteMembershipNotificationJob).to have_been_enqueued.with(membership.id, kind_of(String))
        end
      end

      response "403", "backoffice without provision_school forbidden" do
        let(:school) { create(:school, :provisioning) }
        let(:school_id) { school.id }
        let(:plain_backoffice) { create(:user) }
        let!(:plain_membership) { create(:membership, :backoffice, user: plain_backoffice) }
        let(:Authorization) { auth_headers_for(plain_backoffice)["Authorization"] }
        let(:invitee) { create(:user, email: "blocked@example.com") }
        let!(:membership) { create(:membership, :invited, user: invitee, school: school, role: "guardian") }
        let(:id) { membership.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "backoffice blocked on active school" do
        let(:school) { create(:school, onboarding_status: "active") }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:invitee) { create(:user, email: "active@example.com") }
        let!(:membership) { create(:membership, :invited, user: invitee, school: school, role: "guardian") }
        let(:id) { membership.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "backoffice blocked on pending_handoff school" do
        let(:school) { create(:school, :pending_handoff) }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:invitee) { create(:user, email: "pending@example.com") }
        let!(:membership) { create(:membership, :invited, user: invitee, school: school, role: "guardian") }
        let(:id) { membership.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/provisioning/import" do
    parameter name: :school_id, in: :path, type: :integer

    post "Import families CSV during provisioning" do
      tags "Backoffice"
      consumes "multipart/form-data"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :dry_run, in: :query, type: :boolean, required: false
      parameter name: :file, in: :formData, type: :file, required: true

      let(:school_class) { create(:school_class, school: school, name: "A") }
      let(:csv_content) do
        <<~CSV
          student_name,student_birth_date,student_rg,school_class_name,guardian_name,guardian_email,guardian_phone,guardian_relationship,guardian_zip_code,guardian_street,guardian_number,guardian_neighborhood,guardian_city,guardian_state,student_cpf,guardian_cpf
          Ana Silva,2015-03-10,MG-00000001,A,Maria Silva,maria@example.com,+55 11 99999-0001,mother,01310100,Avenida Paulista,1000,Bela Vista,São Paulo,SP,52998224725,12345678909
        CSV
      end
      let(:file) do
        tempfile = Tempfile.new([ "provisioning-import", ".csv" ])
        tempfile.write(csv_content)
        tempfile.rewind
        Rack::Test::UploadedFile.new(tempfile.path, "text/csv", original_filename: "families.csv")
      end

      response "403", "provisioning-only import blocked on pending_handoff" do
        let(:school) { create(:school, :pending_handoff) }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:dry_run) { true }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "200", "dry run preview during provisioning" do
        let(:school) { create(:school, :provisioning) }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:dry_run) { true }

        before { school_class }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "import", "status")).to eq("previewed")
          expect(body.dig("data", "summary", "valid_rows")).to eq(1)
          expect(Student.count).to eq(0)
          expect(Guardian.count).to eq(0)
        end
      end

      response "200", "commit import during provisioning" do
        let(:school) { create(:school, :provisioning) }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:dry_run) { false }

        before { school_class }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "import", "status")).to eq("committed")
          expect(body.dig("data", "import", "committed_at")).to be_present
          expect(Student.kept.count).to eq(1)
          expect(Guardian.kept.count).to eq(1)
        end
      end

      response "422", "import validation failed" do
        let(:school) { create(:school, :provisioning) }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:dry_run) { true }
        let(:csv_content) do
          <<~CSV
            student_name,student_birth_date,student_rg,school_class_name,guardian_name,guardian_email,guardian_phone,guardian_relationship,guardian_zip_code,guardian_street,guardian_number,guardian_neighborhood,guardian_city,guardian_state
            ,2015-03-10,MG-00000001,Unknown Class,Maria Silva,maria@example.com,+55 11 99999-0001,mother,01310100,Avenida Paulista,1000,Bela Vista,São Paulo,SP
          CSV
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("import_validation_failed")
          expect(body.dig("error", "details", "error_report")).to be_present
          expect(ProvisioningImport.last.status).to eq("failed")
        end
      end
    end
  end
end
