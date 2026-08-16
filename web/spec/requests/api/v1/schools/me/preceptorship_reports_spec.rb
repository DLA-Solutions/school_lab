# frozen_string_literal: true

require "rails_helper"

# Preceptoria as a family reads it: what the school has published about their children, and
# nothing that is still being written.
RSpec.describe "Preceptoria: what the family reads", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Maria Silva") }
  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:pedro) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }
  let!(:family) { create(:student_guardian, school: school, student: pedro, guardian: guardian) }
  let(:carla) { create(:teacher, school: school, name: "Carla Souza") }
  let(:headers) { auth_headers_for(guardian_user) }
  let(:base) { "/api/v1/schools/#{school.id}/me/preceptorship_reports" }

  let!(:published) do
    create(:preceptorship_report, :published,
           school: school, student: pedro, teacher: carla,
           body: "Pedro tem participado bem das aulas.")
  end

  describe "reading" do
    it "lists what the school has published about their child" do
      get base, headers: headers

      expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([ published.id ])
    end

    it "carries the prose, the child and the teacher" do
      get "#{base}/#{published.id}", headers: headers

      data = response.parsed_body["data"]
      expect(data["body"]).to eq("Pedro tem participado bem das aulas.")
      expect(data["student_name"]).to eq("Pedro Silva")
      expect(data["teacher_name"]).to eq("Carla Souza")
    end

    # A teacher's unfinished sentence about somebody's child is not something a family should be
    # able to find by guessing an id.
    it "cannot reach a draft" do
      draft = create(:preceptorship_report, school: school, student: pedro, teacher: carla)

      get "#{base}/#{draft.id}", headers: headers

      expect(response).to have_http_status(:not_found)
    end

    it "cannot reach another family's report" do
      other = create(:preceptorship_report, :published, school: school)

      get "#{base}/#{other.id}", headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "the PDF" do
    it "is the document the family keeps" do
      get "#{base}/#{published.id}/pdf", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("application/pdf")

      text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
      expect(text).to include("Pedro Silva")
      expect(text).to include("Carla Souza")
      expect(text).to include("Pedro tem participado bem das aulas.")
    end

    # The date the family sees is when the school handed it over, not when the file was
    # downloaded — two guardians printing the same report must not get two different dates.
    it "prints the date it was published rather than today" do
      published.update_column(:published_at, Time.zone.parse("2026-05-12 10:00:00"))

      get "#{base}/#{published.id}/pdf", headers: headers

      text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
      expect(text).to include("12/05/2026")
    end

    it "will not print a draft" do
      draft = create(:preceptorship_report, school: school, student: pedro, teacher: carla)

      get "#{base}/#{draft.id}/pdf", headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  it "keeps out a user who is not a guardian at this school" do
    outsider = create(:user)
    create(:membership, :school_admin, user: outsider, school: school)

    get base, headers: auth_headers_for(outsider)

    expect(response).to have_http_status(:forbidden)
  end
end
