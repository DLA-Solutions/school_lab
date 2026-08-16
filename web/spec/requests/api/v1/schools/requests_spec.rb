# frozen_string_literal: true

require "rails_helper"

# Solicitações: the queue of what guardians have asked the school for — a declaration to hand to
# an employer, or a second sitting of a test their child missed. The school works it from one
# screen, so the two kinds sit in one list.
RSpec.describe "Solicitações: the queue the school works", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:base) { "/api/v1/schools/#{school.id}/requests" }

  let(:guardian) { create(:guardian, school: school, name: "Maria Silva") }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }
  let!(:family) { create(:student_guardian, school: school, student: student, guardian: guardian) }

  def queue(query = nil)
    get [ base, query ].compact.join("?"), headers: headers
    response.parsed_body["data"]
  end

  describe "reading the queue" do
    let!(:declaration) do
      create(:guardian_request, school: school, guardian: guardian, student: student,
                                details: "Declaração de matrícula")
    end
    let!(:second_call) do
      create(:guardian_request, :second_call, school: school, guardian: guardian, student: student)
    end

    it "lists what guardians have asked for" do
      expect(queue.map { |row| row["kind"] }).to contain_exactly("declaration", "second_call")
    end

    # A secretary scanning the list is looking for whose child it is about. Sending back only the
    # ids would have made that a second call per row.
    it "names the family rather than only pointing at it" do
      row = queue.find { |item| item["id"] == declaration.id }

      expect(row["guardian_name"]).to eq("Maria Silva")
      expect(row["student_name"]).to eq("Pedro Silva")
    end

    it "narrows to one kind" do
      expect(queue("kind=second_call").map { |row| row["id"] }).to eq([ second_call.id ])
    end

    # The screen lands on the work still to do; a request already answered is history, not queue.
    it "narrows to what is still open" do
      post "#{base}/#{second_call.id}/fulfill", headers: headers, as: :json

      expect(queue("status=open").map { |row| row["id"] }).to eq([ declaration.id ])
    end

    it "keeps another school's requests out" do
      other = create(:school)
      create(:guardian_request, school: other)

      expect(queue.length).to eq(2)
    end
  end

  describe "working a request" do
    let!(:request_record) do
      create(:guardian_request, school: school, guardian: guardian, student: student)
    end

    # The queue is shared. Two people both seeing a pending request will both start on it, and
    # the school finds out when the guardian is telephoned twice.
    it "claims a request so nobody else picks it up" do
      post "#{base}/#{request_record.id}/start", headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(request_record.reload.status).to eq("in_progress")
    end

    it "puts it back when whoever claimed it cannot finish" do
      post "#{base}/#{request_record.id}/start", headers: headers, as: :json
      post "#{base}/#{request_record.id}/release", headers: headers, as: :json

      expect(request_record.reload.status).to eq("pending")
    end

    # Releasing is not an answer to the guardian, so a released request has to look exactly like
    # one nobody has touched yet.
    it "leaves no answer behind when it is released" do
      post "#{base}/#{request_record.id}/start", headers: headers, as: :json
      post "#{base}/#{request_record.id}/release", headers: headers, as: :json

      expect(request_record.reload.resolution_note).to be_nil
      expect(request_record.resolved_at).to be_nil
    end

    it "records who answered it and when" do
      post "#{base}/#{request_record.id}/fulfill", headers: headers, as: :json

      request_record.reload
      expect(request_record.status).to eq("fulfilled")
      expect(request_record.resolved_by_id).to eq(staff_user.id)
      expect(request_record.resolved_at).to be_present
    end

    # A guardian told "no" will ask why, and whoever fields that call needs the reason the school
    # already gave.
    it "refuses to record a refusal with no reason" do
      post "#{base}/#{request_record.id}/reject", headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(request_record.reload.status).to eq("pending")
    end

    it "keeps the reason it was refused for" do
      post "#{base}/#{request_record.id}/reject",
           params: { resolution_note: "Documento já emitido em março." }, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(request_record.reload.resolution_note).to eq("Documento já emitido em março.")
    end

    it "will not answer a request twice" do
      post "#{base}/#{request_record.id}/fulfill", headers: headers, as: :json
      post "#{base}/#{request_record.id}/fulfill", headers: headers, as: :json

      expect(response).to have_http_status(:conflict)
    end
  end

  # A guardian who telephones is not turned away until they log in: the secretary writes down
  # what was asked for on their behalf.
  describe "opening one on a guardian's behalf" do
    it "records it against the guardian who asked" do
      post base,
           params: { guardian_request: { guardian_id: guardian.id, student_id: student.id,
                                         kind: "declaration", details: "Declaração de frequência" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(GuardianRequest.last.guardian_id).to eq(guardian.id)
      expect(GuardianRequest.last.requested_by_id).to eq(staff_user.id)
    end

    # A declaration about a child the guardian has nothing to do with is exactly the document you
    # would forge to prove a connection you do not have.
    it "refuses one about a child in another family's care" do
      stranger = create(:student, school: school, name: "Outra Criança")

      post base,
           params: { guardian_request: { guardian_id: guardian.id, student_id: stranger.id,
                                         kind: "declaration", details: "Declaração" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "who may work the queue" do
    let!(:request_record) do
      create(:guardian_request, school: school, guardian: guardian, student: student)
    end

    # `teach` is not the archive desk; a teacher has no business in the school's papers.
    it "keeps a teacher out" do
      teacher_user = create(:user)
      create(:membership, user: teacher_user, school: school, role: "staff")

      get base, headers: auth_headers_for(teacher_user)

      expect(response).to have_http_status(:forbidden)
    end

    # Answering a request is the school's to do. A guardian marking their own fulfilled would be
    # marking the school's work done for it.
    #
    # The queue answers 404 rather than 403: these paths are the school's own, and a guardian
    # reaching one is told it is not there rather than that it exists and is barred.
    it "keeps the guardian from answering their own" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")
      guardian.update!(user: guardian_user)

      post "#{base}/#{request_record.id}/fulfill", headers: auth_headers_for(guardian_user), as: :json

      expect(response).to have_http_status(:not_found)
      expect(request_record.reload.status).to eq("pending")
    end
  end
end
