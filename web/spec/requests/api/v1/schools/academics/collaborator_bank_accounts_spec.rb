# frozen_string_literal: true

require "rails_helper"

# Where a collaborator's salary is sent. A pix key is enough on its own; a branch and account
# number are the longer road, and the bank is written in words because a code list decided here
# goes stale every time two banks merge.
RSpec.describe "A collaborator's bank details", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }

  let(:teacher) { create(:teacher, school: school, name: "Carla Nogueira") }
  let(:path) { "/api/v1/schools/#{school.id}/academics/teachers/#{teacher.id}/bank_account" }

  def write(details)
    put path, params: { bank_account: details }, headers: headers, as: :json
    response.parsed_body
  end

  # An unfilled record is a collaborator who cannot be paid yet, which is a different thing from
  # details that failed to load — so the school is told plainly rather than shown an error.
  it "answers an empty sheet for a collaborator nobody has set up yet" do
    get path, headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["data"]).to include("filled" => false, "pix_key" => nil)
  end

  it "keeps a pix key on its own, with no bank or account" do
    body = write(pix_key: "carla@example.com")

    expect(response).to have_http_status(:ok)
    expect(body["data"]).to include("pix_key" => "carla@example.com", "filled" => true)
  end

  it "keeps the bank in the words the payer will recognise, with branch and account" do
    body = write(bank_name: "Banco do Brasil", agency: "1234-5", account_number: "98765-4")

    expect(response).to have_http_status(:ok)
    expect(body["data"]).to include(
      "bank_name" => "Banco do Brasil", "agency" => "1234-5", "account_number" => "98765-4"
    )
  end

  # Half an account is not a route to anywhere: a payer given a branch and no number, or no bank,
  # cannot send anything.
  it "refuses a branch with no account number" do
    body = write(bank_name: "Banco do Brasil", agency: "1234-5")

    expect(response).to have_http_status(:unprocessable_content)
    expect(body.dig("error", "details")).to have_key("account_number")
  end

  it "refuses an account at no named bank" do
    body = write(agency: "1234-5", account_number: "98765-4")

    expect(response).to have_http_status(:unprocessable_content)
    expect(body.dig("error", "details")).to have_key("bank_name")
  end

  it "refuses a form with nothing in it" do
    body = write(pix_key: "", bank_name: "", agency: "", account_number: "")

    expect(response).to have_http_status(:unprocessable_content)
    expect(body.dig("error", "details")).to have_key("base")
  end

  # One standing record, not a history: the school pays into the account that is current.
  it "replaces the details rather than keeping a second set" do
    write(pix_key: "carla@example.com")
    write(bank_name: "Nubank", agency: "0001", account_number: "12345-6", pix_key: "")

    expect(TeacherBankAccount.where(teacher_id: teacher.id).count).to eq(1)
    expect(response.parsed_body["data"]).to include("pix_key" => nil, "bank_name" => "Nubank")
  end

  # Money leaves on the strength of this record, so it has to say who last wrote it.
  it "records who wrote it last" do
    body = write(pix_key: "carla@example.com")

    expect(body["data"]["updated_by_name"]).to eq(staff_user.email)
  end

  # The pix key and the account number identify a person to a bank; the database is not where
  # they should be readable.
  it "does not keep the pix key in the clear" do
    write(pix_key: "carla@example.com")

    stored = ActiveRecord::Base.connection.select_value(
      "SELECT pix_key FROM teacher_bank_accounts WHERE teacher_id = #{teacher.id}"
    )
    expect(stored).not_to include("carla@example.com")
  end

  it "is closed to staff without the people permission" do
    plain_user = create(:user)
    create(:membership, user: plain_user, school: school, role: "teacher")

    get path, headers: auth_headers_for(plain_user)

    expect(response).to have_http_status(:forbidden)
  end

  it "does not reach another school's collaborator" do
    stranger = create(:teacher, school: create(:school))

    get "/api/v1/schools/#{school.id}/academics/teachers/#{stranger.id}/bank_account",
        headers: headers

    expect(response).to have_http_status(:not_found)
  end
end
