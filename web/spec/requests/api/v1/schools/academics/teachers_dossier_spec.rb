# frozen_string_literal: true

require "swagger_helper"

# LUI-6: the full collaborator roster (active + discarded) as one PDF, so a backoffice/school user
# can read every collaborator's context at once instead of opening each dialog in turn. Gated by
# TeacherPolicy#dossier? -- the same `manage_people` permission as the Colaboradores roster itself.
RSpec.describe "Api::V1::Schools::Academics::TeachersDossier", type: :request do
  let(:school) { create(:school, name: "Escola Girassol") }
  let(:school_id) { school.id }

  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/academics/teachers_dossier" do
    parameter name: :school_id, in: :path, type: :integer

    get "The full collaborator roster as a PDF, for manage_people staff" do
      tags "Teachers", "Academic"
      produces "application/pdf", "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "200", "manage_people staff exports the dossier" do
        let!(:teacher) { create(:teacher, school: school, name: "Carla Souza") }

        run_test! do |response|
          expect(response.media_type).to eq("application/pdf")
          expect(response.body).to be_present
          expect(response.body).to start_with("%PDF")

          text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
          expect(text).to include(school.name)
          expect(text).to include("Carla Souza")
        end
      end

      # BR: the whole roster, not the search on the Colaboradores screen -- every collaborator in
      # the school is included, with no filter param honored on this endpoint.
      response "200", "includes every collaborator in the school, active and discarded alike" do
        let!(:active_teacher) { create(:teacher, school: school, name: "Carla Souza") }
        let!(:discarded_teacher) do
          teacher = create(:teacher, school: school, name: "Bruno Lima")
          teacher.discard
          teacher
        end

        run_test! do |response|
          text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
          expect(text).to include("Carla Souza")
          expect(text).to include("Ativo")
          expect(text).to include("Bruno Lima")
          expect(text).to include("Desligado")
        end
      end

      response "403", "staff without manage_people" do
        let(:plain_user) { create(:user) }
        let(:Authorization) { auth_headers_for(plain_user)["Authorization"] }

        before do
          teacher_template = create_system_templates_for(school).find { |t| t.system_key == "teacher" }
          membership = create(:membership, user: plain_user, school: school, role: "teacher")
          create(:staff_profile, membership: membership, school: school, role_template: teacher_template)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  # Tenant isolation (LUI-6 test plan item 5): a collaborator from a different school must never
  # appear in this school's dossier.
  it "never includes a collaborator from a different school" do
    create(:teacher, school: create(:school), name: "Fora Da Escola")
    create(:teacher, school: school, name: "Carla Souza")

    get "/api/v1/schools/#{school.id}/academics/teachers_dossier",
        headers: auth_headers_for(staff_user)

    expect(response).to have_http_status(:ok)
    text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
    expect(text).to include("Carla Souza")
    expect(text).not_to include("Fora Da Escola")
  end

  it "renders without error for a collaborator with no health profile or bank account on file" do
    create(:teacher, school: school, name: "Bruno Lima")

    get "/api/v1/schools/#{school.id}/academics/teachers_dossier",
        headers: auth_headers_for(staff_user)

    expect(response).to have_http_status(:ok)
    text = PDF::Inspector::Text.analyze(response.body).strings.join(" ")
    expect(text).to include("Bruno Lima")
    expect(text).to include("Não preenchido")
  end
end
