# frozen_string_literal: true

require "rails_helper"

# Preceptoria: a teacher's account, in prose, of how one student is getting on. Written as a draft
# and published deliberately — the family sees it only once the teacher has finished.
RSpec.describe "Preceptoria: what the teacher writes", type: :request do
  let(:school) { create(:school) }
  let(:base) { "/api/v1/schools/#{school.id}/academics/preceptorship_reports" }

  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let!(:pedro) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }

  # A teacher who holds `teach` through the system template, and teaches Pedro's cohort.
  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) do
    create(:membership, user: teacher_user, school: school, role: "teacher")
  end
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }
  let(:headers) { auth_headers_for(teacher_user) }

  let(:maths) { create(:subject, school: school, name: "Matemática") }

  before do
    templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
    create(:staff_profile,
           membership: teacher_membership,
           school: school,
           role_template: templates["teacher"])
    create(:teaching_assignment,
           school: school, teacher: carla, school_class: school_class, subject: maths)
  end

  def write(body: "Pedro tem participado bem das aulas.", student: pedro)
    post base,
         params: { preceptorship_report: { student_id: student.id, body: body } },
         headers: headers, as: :json
    response.parsed_body["data"]
  end

  describe "writing one" do
    it "starts as a draft, signed by the teacher" do
      report = write

      expect(response).to have_http_status(:created)
      expect(report["status"]).to eq("draft")
      expect(report["teacher_name"]).to eq("Carla Souza")
      expect(report["student_name"]).to eq("Pedro Silva")
    end

    it "refuses one with nothing written in it" do
      write(body: "")

      expect(response).to have_http_status(:unprocessable_content)
    end

    # A teacher writes about the students they teach and no others.
    it "refuses a student whose cohort they do not teach" do
      other_class = create(:school_class, school: school, name: "B", year: 2026)
      stranger = create(:student, school: school, school_class: other_class, name: "Outra Criança")

      write(student: stranger)

      expect(response).to have_http_status(:forbidden)
    end

    it "keeps working on a draft" do
      report = write

      put "#{base}/#{report['id']}",
          params: { preceptorship_report: { body: "Segunda versão, mais completa." } },
          headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(PreceptorshipReport.find(report["id"]).body).to eq("Segunda versão, mais completa.")
    end
  end

  describe "publishing" do
    let(:draft) { write }

    it "hands it to the family and stamps when" do
      post "#{base}/#{draft['id']}/publish", headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      record = PreceptorshipReport.find(draft["id"])
      expect(record.status).to eq("published")
      expect(record.published_at).to be_present
    end

    # Once a family has read what a teacher wrote about their child, editing it would change what
    # they were told without their knowing.
    it "will not let a published report be rewritten" do
      post "#{base}/#{draft['id']}/publish", headers: headers, as: :json

      put "#{base}/#{draft['id']}",
          params: { preceptorship_report: { body: "Na verdade, não foi bem assim." } },
          headers: headers, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(PreceptorshipReport.find(draft["id"]).body).to eq("Pedro tem participado bem das aulas.")
    end

    # A draft is a teacher's own working paper. A published one is the school's record of what a
    # family was told, and deleting it would erase that.
    it "will not let a published report be deleted" do
      post "#{base}/#{draft['id']}/publish", headers: headers, as: :json

      delete "#{base}/#{draft['id']}", headers: headers, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(PreceptorshipReport.kept.count).to eq(1)
    end

    it "throws away a draft" do
      delete "#{base}/#{draft['id']}", headers: headers, as: :json

      expect(response).to have_http_status(:no_content)
      expect(PreceptorshipReport.kept.count).to eq(0)
    end

    it "will not publish the same report twice" do
      post "#{base}/#{draft['id']}/publish", headers: headers, as: :json
      post "#{base}/#{draft['id']}/publish", headers: headers, as: :json

      expect(response).to have_http_status(:conflict)
    end
  end

  describe "the PDF" do
    it "draws the school, the child, the teacher and the prose" do
      report = write
      post "#{base}/#{report['id']}/publish", headers: headers, as: :json

      get "#{base}/#{report['id']}/pdf", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("application/pdf")

      text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
      expect(text).to include(school.name)
      expect(text).to include("Pedro Silva")
      expect(text).to include("Carla Souza")
      expect(text).to include("Pedro tem participado bem das aulas.")
    end

    # A teacher has to be able to see exactly what was sent home, so the draft prints too.
    it "prints a draft for the teacher who is still writing it" do
      report = write

      get "#{base}/#{report['id']}/pdf", headers: headers

      expect(response).to have_http_status(:ok)
    end
  end

  # A screen for writing preceptoria has to offer a roll, and the register's own student list is
  # gated on a permission teachers do not hold.
  describe "the roll" do
    it "offers the students of the cohorts this teacher teaches" do
      other_class = create(:school_class, school: school, name: "B", year: 2026)
      create(:student, school: school, school_class: other_class, name: "Outra Criança")

      get "#{base}/roll", headers: headers

      names = response.parsed_body["data"].map { |row| row["name"] }
      expect(names).to eq([ "Pedro Silva" ])
    end

    it "names the cohort, so two children with the same name can be told apart" do
      get "#{base}/roll", headers: headers

      expect(response.parsed_body["data"].first["school_class_name"]).to eq(school_class.full_name)
    end
  end

  describe "who may write one" do
    # The secretary who files the school's papers has no business writing an account of a child.
    it "keeps out staff who do not teach" do
      secretary_user = create(:user)
      secretary_membership = create(:membership, user: secretary_user, school: school, role: "staff")
      templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
      create(:staff_profile,
             membership: secretary_membership, school: school,
             role_template: templates["secretary"])

      get base, headers: auth_headers_for(secretary_user)

      expect(response).to have_http_status(:forbidden)
    end
  end
end
