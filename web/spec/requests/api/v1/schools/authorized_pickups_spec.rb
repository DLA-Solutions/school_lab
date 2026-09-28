# frozen_string_literal: true

require "rails_helper"

# Who may collect a child at the gate. The family names them from the portal; staff read the list
# at the moment somebody turns up asking for the student.
RSpec.describe "Who may collect a student", type: :request do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school, name: "Mariana Sales") }

  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:staff_headers) { auth_headers_for(staff_user) }

  let(:guardian_user) { create(:user) }
  let(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Carolina Sales") }
  let!(:guardian_membership) do
    create(:membership, user: guardian_user, school: school, role: "guardian")
  end
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:guardian_headers) { auth_headers_for(guardian_user) }

  let(:school_path) do
    "/api/v1/schools/#{school.id}/people/students/#{student.id}/authorized_pickups"
  end
  let(:portal_path) { "/api/v1/schools/#{school.id}/me/students/#{student.id}/authorized_pickups" }

  def photo
    Rack::Test::UploadedFile.new(
      Rails.root.join("spec/fixtures/files/photo.png"), "image/png"
    )
  end

  def add(params = {}, headers: guardian_headers)
    post portal_path,
         params: { authorized_pickup: { name: "Avó Marta", cpf: "529.982.247-25",
                                        phone: "62999990000" }.merge(params) },
         headers: headers
  end

  describe "the family naming somebody" do
    it "adds them to the child's list" do
      add

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "name")).to eq("Avó Marta")
      expect(response.parsed_body.dig("data", "phone")).to eq("62999990000")
    end

    # Stored as bare digits, like every other document here, whatever the family typed.
    it "keeps the CPF in its canonical form" do
      add

      expect(response.parsed_body.dig("data", "cpf")).to eq("52998224725")
    end

    it "refuses a CPF that is not a real document" do
      add({ cpf: "111.111.111-11" })

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details", "cpf")).to include(
        I18n.t("activerecord.errors.models.authorized_pickup.attributes.cpf.invalid")
      )
    end

    it "refuses somebody with no name" do
      add({ name: "" })

      expect(response).to have_http_status(:unprocessable_content)
    end

    # The same person twice on one child's list is a data-entry slip, not two authorisations.
    it "refuses the same person twice on one child" do
      add
      add

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details", "cpf")).to include(
        I18n.t("activerecord.errors.models.authorized_pickup.attributes.cpf.taken")
      )
    end

    it "accepts a photo of the person" do
      add({ photo: photo })

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "has_photo")).to be(true)
      expect(response.parsed_body.dig("data", "photo_url")).to be_present
    end

    # A photo nobody can open is worse than none: staff would be at the gate with a broken image.
    it "refuses a file that is not an image" do
      add({ photo: Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/note.txt"),
                                                "text/plain") })

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "says who put them on the list" do
      add

      expect(response.parsed_body.dig("data", "created_by_name")).to eq(guardian_user.email)
    end

    it "does not reach another family's child" do
      stranger = create(:student, school: school, name: "Outro Aluno")

      post "/api/v1/schools/#{school.id}/me/students/#{stranger.id}/authorized_pickups",
           params: { authorized_pickup: { name: "Alguém", cpf: "529.982.247-25" } },
           headers: guardian_headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "withdrawing somebody" do
    it "takes them off the list" do
      add
      id = response.parsed_body.dig("data", "id")

      delete "#{portal_path}/#{id}", headers: guardian_headers

      expect(response).to have_http_status(:no_content)

      get portal_path, headers: guardian_headers
      expect(response.parsed_body["data"]).to be_empty
    end

    # Who was allowed to collect the child on a given day is exactly what gets asked afterwards.
    it "keeps the record rather than deleting it" do
      add
      id = response.parsed_body.dig("data", "id")

      expect { delete "#{portal_path}/#{id}", headers: guardian_headers }
        .not_to change(AuthorizedPickup, :count)

      expect(AuthorizedPickup.find(id)).to be_discarded
    end

    it "lets the same person be authorised again later" do
      add
      id = response.parsed_body.dig("data", "id")
      delete "#{portal_path}/#{id}", headers: guardian_headers

      add

      expect(response).to have_http_status(:created)
    end
  end

  describe "the school reading the list" do
    before { add }

    it "shows who may collect the child" do
      get school_path, headers: staff_headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"].map { |row| row["name"] }).to eq([ "Avó Marta" ])
    end

    # The family authorises. A staff member who could add a name here would be letting a stranger
    # through the gate with the record saying it was allowed all along.
    it "does not let the school add somebody on the family's behalf" do
      post school_path,
           params: { authorized_pickup: { name: "Alguém", cpf: "529.982.247-25" } },
           headers: staff_headers

      expect(response).to have_http_status(:not_found).or have_http_status(:forbidden)
    end

    it "does not reach another school's student" do
      other = create(:school)
      other_student = create(:student, school: other)

      get "/api/v1/schools/#{school.id}/people/students/#{other_student.id}/authorized_pickups",
          headers: staff_headers

      expect(response).to have_http_status(:not_found)
    end
  end

  it "refuses an unauthenticated caller" do
    get school_path

    expect(response).to have_http_status(:unauthorized)
  end
end
