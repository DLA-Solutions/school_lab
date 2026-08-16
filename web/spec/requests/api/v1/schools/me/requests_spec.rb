# frozen_string_literal: true

require "rails_helper"

# The guardian's side of Solicitações: asking the school for something, and seeing where the ask
# has got to.
RSpec.describe "Solicitações: what a guardian asked for", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Maria Silva") }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }
  let!(:family) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:headers) { auth_headers_for(guardian_user) }
  let(:base) { "/api/v1/schools/#{school.id}/me/requests" }

  describe "asking" do
    it "opens a request for a declaration" do
      post base,
           params: { guardian_request: { student_id: student.id, kind: "declaration",
                                         details: "Declaração de matrícula para o trabalho" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "status")).to eq("pending")
    end

    # No gate on the kind: a guardian asks for what they need, and whether the school can give it
    # is the school's answer to make, not the form's.
    it "opens a request for a second sitting, naming the test" do
      maths = create(:subject, school: school, name: "Matemática")

      post base,
           params: { guardian_request: { student_id: student.id, kind: "second_call",
                                         subject_id: maths.id, reference_date: "2026-05-12",
                                         details: "Faltou por consulta médica" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "subject_name")).to eq("Matemática")
    end

    # The two fields belong to the other kind's form. A guardian who switched kind mid-form
    # should not be told off for what the form left behind.
    it "drops the test details from a declaration rather than refusing it" do
      maths = create(:subject, school: school, name: "Matemática")

      post base,
           params: { guardian_request: { student_id: student.id, kind: "declaration",
                                         subject_id: maths.id, reference_date: "2026-05-12",
                                         details: "Declaração" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(GuardianRequest.last.subject_id).to be_nil
      expect(GuardianRequest.last.reference_date).to be_nil
    end

    it "refuses one with nothing written in it" do
      post base,
           params: { guardian_request: { student_id: student.id, kind: "declaration", details: "" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "refuses one about a child not in their care" do
      stranger = create(:student, school: school, name: "Outra Criança")

      post base,
           params: { guardian_request: { student_id: stranger.id, kind: "declaration",
                                         details: "Declaração" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    # Whose request it is is not something the asker gets to state.
    it "ignores a guardian id in the body" do
      other = create(:guardian, school: school, name: "Outra Família")

      post base,
           params: { guardian_request: { guardian_id: other.id, student_id: student.id,
                                         kind: "declaration", details: "Declaração" } },
           headers: headers, as: :json

      expect(GuardianRequest.last.guardian_id).to eq(guardian.id)
    end
  end

  describe "following it" do
    let!(:mine) do
      create(:guardian_request, school: school, guardian: guardian, student: student,
                                details: "Declaração de matrícula")
    end
    let!(:another_familys) { create(:guardian_request, school: school) }

    it "lists only what this guardian asked for" do
      get base, headers: headers

      expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([ mine.id ])
    end

    it "will not show another family's request" do
      get "#{base}/#{another_familys.id}", headers: headers

      expect(response).to have_http_status(:not_found)
    end

    # The answer is the point of following it: a guardian refused needs to read why without
    # telephoning the school back.
    it "carries the school's answer once it is given" do
      mine.resolution_note = "Documento já emitido em março."
      mine.reject!

      get "#{base}/#{mine.id}", headers: headers

      expect(response.parsed_body.dig("data", "resolution_note")).to eq("Documento já emitido em março.")
    end
  end

  it "keeps out a user who is not a guardian at this school" do
    outsider = create(:user)
    create(:membership, :school_admin, user: outsider, school: school)

    get base, headers: auth_headers_for(outsider)

    expect(response).to have_http_status(:forbidden)
  end
end
