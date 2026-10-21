# frozen_string_literal: true

require "rails_helper"

# Blob links in API responses are bearer capabilities, so they must stay short-lived, reachable
# through the /api prefix, and never offer an anonymous way to write into the bucket.
RSpec.describe "Active Storage endpoints", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let!(:membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:student) { create(:student, school: school) }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let!(:document) { create(:document, :approved, school: school, documentable: student) }

  def file_url_for(user)
    get "/api/v1/schools/#{school.id}/me/documents", headers: auth_headers_for(user)
    JSON.parse(response.body).fetch("data").first.fetch("file_url")
  end

  it "hands out a link under the /api prefix that redirects to the storage service" do
    url = file_url_for(guardian_user)

    expect(url).to start_with("/api/active_storage/blobs/redirect/")

    get url
    expect(response).to have_http_status(:redirect)
  end

  it "stops honouring the link once its signed id expired" do
    url = file_url_for(guardian_user)

    travel_to(16.minutes.from_now) { get url }

    expect(response).to have_http_status(:not_found)
  end

  it "does not hand out a link for a document outside the guardian's family" do
    other = create(:document, :approved, school: school, documentable: create(:student, school: school))

    get "/api/v1/schools/#{school.id}/me/documents", headers: auth_headers_for(guardian_user)

    ids = JSON.parse(response.body).fetch("data").map { |row| row["id"] }
    expect(ids).to contain_exactly(document.id)
    expect(ids).not_to include(other.id)
  end

  it "refuses anonymous direct uploads and creates no blob" do
    expect do
      post "/api/active_storage/direct_uploads",
           params: { blob: { filename: "x.pdf", byte_size: 10, checksum: "abc", content_type: "application/pdf" } },
           as: :json
    end.not_to change(ActiveStorage::Blob, :count)

    expect(response).to have_http_status(:not_found)
  end
end
