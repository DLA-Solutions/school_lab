# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Collaborator register: post, hire date, search and documents", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:base) { "/api/v1/schools/#{school.id}/academics/teachers" }
  let(:coordinator) { create(:job_position, school: school, name: "Coordenadora") }

  describe "employment details" do
    it "records the post and the start of the engagement" do
      post base,
           params: {
             teacher: {
               name: "Carla Nogueira",
               cpf: "529.982.247-25",
               email: "carla@example.com",
               job_position_id: coordinator.id,
               hired_on: "2024-02-01"
             }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      # The payload carries the post's name so a listing reads without resolving the association.
      expect(response.parsed_body["data"]).to include(
        "job_position_id" => coordinator.id, "job_title" => "Coordenadora", "hired_on" => "2024-02-01"
      )
    end

    # The register covers every post, so the post is what tells one collaborator from another.
    it "refuses a collaborator with no post" do
      post base,
           params: { teacher: { name: "Sem cargo", cpf: "529.982.247-25", email: "s@example.com" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("job_position")
    end

    # The hire date stays optional: rows that predate the column have no honest value for it.
    it "accepts a collaborator with no hire date" do
      post base,
           params: {
             teacher: { name: "Sem data", cpf: "529.982.247-25", email: "s@example.com",
                        job_position_id: coordinator.id }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "hired_on")).to be_nil
    end

    it "refuses a hire date in the future" do
      post base,
           params: {
             teacher: { name: "Futuro", cpf: "529.982.247-25", email: "f@example.com",
                        job_position_id: coordinator.id, hired_on: 1.day.from_now.to_date.to_s }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("hired_on")
    end
  end

  describe "search" do
    let!(:carla) { create(:teacher, school: school, name: "Carla Nogueira", cpf: "12345678909") }
    let!(:bruno) { create(:teacher, school: school, name: "Bruno Alves", cpf: "52998224725") }

    def names(term)
      get base, params: { q: term }, headers: headers
      response.parsed_body["data"].map { |row| row["name"] }
    end

    it "matches part of the name" do
      expect(names("Nogueira")).to eq(["Carla Nogueira"])
    end

    it "ignores case" do
      expect(names("carla")).to eq(["Carla Nogueira"])
    end

    it "also matches the CPF, formatted or bare" do
      expect(names("529.982.247-25")).to eq(["Bruno Alves"])
      expect(names("52998224725")).to eq(["Bruno Alves"])
    end

    it "returns everyone when the term is blank" do
      expect(names("")).to match_array([carla.name, bruno.name])
    end

    it "returns nothing when nothing matches" do
      expect(names("Ninguém")).to be_empty
    end

    it "does not reach collaborators of another school" do
      create(:teacher, school: create(:school), name: "Carla Externa")

      expect(names("Carla")).to eq(["Carla Nogueira"])
    end
  end

  describe "personal documents" do
    let(:teacher) { create(:teacher, school: school) }
    let(:documents_path) { "/api/v1/schools/#{school.id}/documents" }
    let(:file) { fixture_file_upload_stub }

    def fixture_file_upload_stub
      Rack::Test::UploadedFile.new(
        StringIO.new("conteudo"), "application/pdf", true, original_filename: "rg.pdf"
      )
    end

    it "accepts a document attached to a collaborator" do
      post documents_path,
           params: {
             document: {
               documentable_type: "Teacher",
               documentable_id: teacher.id,
               document_type: "rg",
               file: file
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["data"]).to include(
        "documentable_type" => "Teacher", "documentable_id" => teacher.id
      )
    end

    it "lists only that collaborator's documents" do
      create(:document, school: school, documentable: teacher, document_type: "rg")
      other = create(:teacher, school: school)
      create(:document, school: school, documentable: other, document_type: "cpf")

      get documents_path,
          params: { documentable_type: "Teacher", documentable_id: teacher.id },
          headers: headers

      ids = response.parsed_body["data"].map { |row| row["documentable_id"] }
      expect(ids).to eq([teacher.id])
    end

    it "refuses a collaborator from another school" do
      outsider = create(:teacher, school: create(:school))

      post documents_path,
           params: {
             document: {
               documentable_type: "Teacher",
               documentable_id: outsider.id,
               document_type: "rg",
               file: file
             }
           },
           headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end
end
