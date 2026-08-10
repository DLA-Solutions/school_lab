# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Job positions register", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:base) { "/api/v1/schools/#{school.id}/academics/job_positions" }

  describe "the standard set" do
    it "provisions the posts a school starts with" do
      post "#{base}/provision_defaults", headers: headers, as: :json

      expect(response).to have_http_status(:created)

      names = response.parsed_body["data"].map { |row| row["name"] }
      expect(names).to include(
        "Professor(a)", "Estagiário(a)", "Auxiliar de sala", "Auxiliar de Serviços Gerais",
        "Secretária", "Coordenadora", "Diretor(a)"
      )
    end

    # Running it twice must not duplicate what is already there.
    it "is idempotent" do
      2.times { post "#{base}/provision_defaults", headers: headers, as: :json }

      expect(school.job_positions.kept.where(name: "Professor(a)").count).to eq(1)
      expect(school.job_positions.kept.count).to eq(JobPosition::DEFAULT_NAMES.length)
    end

    it "keeps a post the school added itself" do
      create(:job_position, school: school, name: "Nutricionista")

      post "#{base}/provision_defaults", headers: headers, as: :json

      expect(school.job_positions.kept.pluck(:name)).to include("Nutricionista")
    end
  end

  describe "managing posts" do
    it "creates one" do
      post base, params: { job_position: { name: "Bibliotecária" } }, headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "name")).to eq("Bibliotecária")
    end

    it "rejects a duplicate name in the same school" do
      create(:job_position, school: school, name: "Secretária")

      post base, params: { job_position: { name: "Secretária" } }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("name")
    end

    it "allows the same name in another school" do
      create(:job_position, school: create(:school), name: "Secretária")

      post base, params: { job_position: { name: "Secretária" } }, headers: headers, as: :json

      expect(response).to have_http_status(:created)
    end

    it "renames one" do
      position = create(:job_position, school: school, name: "Coordenadora")

      patch "#{base}/#{position.id}",
            params: { job_position: { name: "Coordenação pedagógica" } },
            headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(position.reload.name).to eq("Coordenação pedagógica")
    end

    it "removes one nobody holds" do
      position = create(:job_position, school: school)

      delete "#{base}/#{position.id}", headers: headers

      expect(response).to have_http_status(:no_content)
      expect(position.reload).to be_discarded
    end

    # A collaborator is required to hold a post, so removing one in use would strand them.
    it "refuses to remove a post that is in use, and says how many hold it" do
      position = create(:job_position, school: school)
      create_list(:teacher, 2, school: school, job_position: position)

      delete "#{base}/#{position.id}", headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details", "base").first).to include("2")
      expect(position.reload).not_to be_discarded
    end

    it "allows removal once the last holder is gone" do
      position = create(:job_position, school: school)
      teacher = create(:teacher, school: school, job_position: position)
      teacher.discard

      delete "#{base}/#{position.id}", headers: headers

      expect(response).to have_http_status(:no_content)
    end
  end

  describe "listing" do
    it "reports how many collaborators hold each post" do
      position = create(:job_position, school: school, name: "Porteiro")
      create(:teacher, school: school, job_position: position)

      get base, headers: headers

      row = response.parsed_body["data"].find { |p| p["id"] == position.id }
      expect(row["collaborator_count"]).to eq(1)
      expect(row["in_use"]).to be(true)
    end

    it "does not reach another school's posts" do
      create(:job_position, school: create(:school), name: "Externo")
      create(:job_position, school: school, name: "Interno")

      get base, headers: headers

      expect(response.parsed_body["data"].map { |p| p["name"] }).to eq([ "Interno" ])
    end

    it "denies a guardian" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      get base, headers: auth_headers_for(guardian_user)

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "collaborators" do
    it "refuses a collaborator whose post belongs to another school" do
      outsider = create(:job_position, school: create(:school))

      post "/api/v1/schools/#{school.id}/academics/teachers",
           params: {
             teacher: { name: "Carla", cpf: "529.982.247-25", email: "c@example.com",
                        job_position_id: outsider.id }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end
  end
end
