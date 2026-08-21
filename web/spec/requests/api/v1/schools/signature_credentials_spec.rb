# frozen_string_literal: true

require "rails_helper"

# A school's Autentique registration, from the backoffice rather than from a terminal. The token
# goes in and never comes back out; what comes back is what finishes the job in Autentique's own
# settings — the webhook URL, and the secret, the once.
RSpec.describe "Schools: signature credentials", type: :request do
  let(:school) { create(:school) }
  let(:base) { "/api/v1/schools/#{school.id}/signature_credentials" }

  let(:operator) { create(:user) }
  let!(:operator_membership) { create(:membership, :backoffice, user: operator) }
  let(:operator_headers) { auth_headers_for(operator) }

  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }

  def register(token:, as: operator_headers)
    post base, params: { api_token: token }, headers: as, as: :json
  end

  describe "listing" do
    it "says a school with nothing registered has nothing registered" do
      get base, headers: operator_headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"]).to be_empty
    end

    # The token is stored encrypted and is never read back out, so there is no view of this
    # resource that carries it — not even for the operator who typed it in.
    it "never carries the token or the secret" do
      create(:school_signature_provider, :autentique, school: school)

      get base, headers: operator_headers

      row = response.parsed_body["data"].first
      expect(row.keys).not_to include("api_token", "webhook_secret")
      expect(row["provider"]).to eq("autentique")
      expect(row["webhook_secret_set"]).to be(true)
    end

    # A configuration with no secret answers 401 to every callback, and the school never learns
    # that a family signed. The screen has to be able to say so.
    it "says when there is no webhook secret to verify callbacks against" do
      create(:school_signature_provider, :autentique, school: school, webhook_secret: nil)

      get base, headers: operator_headers

      expect(response.parsed_body["data"].first["webhook_secret_set"]).to be(false)
    end
  end

  describe "registering" do
    it "stores the token and answers with the webhook URL and secret" do
      register(token: "live-autentique-token")

      expect(response).to have_http_status(:created)
      body = response.parsed_body["data"]
      expect(body["provider"]).to eq("autentique")
      expect(body["active"]).to be(true)
      expect(body["webhook_path"]).to match(%r{\A/webhooks/signatures/.+})
      # The one response that carries it: it has to be pasted into Autentique and cannot be read
      # back afterwards.
      expect(body["webhook_secret"]).to be_present

      config = SchoolSignatureProvider.find_by(school: school, provider: "autentique")
      expect(config.api_token).to eq("live-autentique-token")
      expect(config.uploaded_by_id).to eq(operator.id)
    end

    # Rotation: the same screen, the same action, and the old token stops working.
    it "replaces the token already registered" do
      register(token: "first-token")
      register(token: "second-token")

      expect(SchoolSignatureProvider.where(school: school, provider: "autentique").count).to eq(1)
      expect(SchoolSignatureProvider.find_by(school: school).api_token).to eq("second-token")
    end

    # One active configuration per school is a partial unique index; anything else stands down
    # rather than colliding.
    it "stands down whatever else the school had active" do
      existing = create(:school_signature_provider, school: school, provider: "fake")

      register(token: "live-autentique-token")

      expect(response).to have_http_status(:created)
      expect(existing.reload.active).to be(false)
      expect(SchoolSignatureProvider.where(school: school, active: true).count).to eq(1)
    end

    it "refuses an empty token rather than registering an unusable configuration" do
      register(token: "")

      expect(response).to have_http_status(:unprocessable_content)
      expect(SchoolSignatureProvider.where(school: school)).to be_empty
    end

    # `fake` fabricates a document nobody signs; pointing a real school at it would leave
    # contracts that look sent and are not.
    it "refuses a provider that is not selectable through the API" do
      post base, params: { provider: "fake", api_token: "anything" },
                 headers: operator_headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(SchoolSignatureProvider.where(school: school)).to be_empty
    end
  end

  # The platform's operators, and the school's own owner. The token creates documents in the
  # school's name, so it is the owner's to hold — not staff at large.
  describe "who may do it" do
    # `:school_admin` provisions the director template and marks the profile as owner.
    let(:owner) { school_admin }

    # The director's role template and permissions, everything but the ownership flag — only one
    # owner per school is allowed, so this one is built alongside rather than through the trait.
    let(:deputy) { create(:user) }
    let!(:deputy_membership) do
      membership = create(:membership, :staff, user: deputy, school: school)
      templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
      StaffProfile.create!(membership: membership, school: school,
                           role_template: templates["director"], is_owner: false,
                           display_title: "Deputy")
      membership
    end

    it "lets the school's owner register their own school's token" do
      get base, headers: auth_headers_for(owner)
      expect(response).to have_http_status(:ok)

      register(token: "owner-registered-token", as: auth_headers_for(owner))
      expect(response).to have_http_status(:created)
      expect(SchoolSignatureProvider.find_by(school: school).api_token).to eq("owner-registered-token")
    end

    # The token creates documents in the school's name, so it does not fall to staff at large the
    # way a permission key would.
    it "refuses a school administrator who is not the owner" do
      get base, headers: auth_headers_for(deputy)
      expect(response).to have_http_status(:forbidden)

      register(token: "live-autentique-token", as: auth_headers_for(deputy))
      expect(response).to have_http_status(:forbidden)
      expect(SchoolSignatureProvider.where(school: school)).to be_empty
    end

    # The scope is what keeps an owner to their own school.
    it "refuses an owner reaching for another school" do
      other_school = create(:school)

      get "/api/v1/schools/#{other_school.id}/signature_credentials", headers: auth_headers_for(owner)

      expect(response).to have_http_status(:forbidden)
    end
  end
end
