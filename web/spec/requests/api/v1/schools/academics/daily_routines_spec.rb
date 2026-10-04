# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Academics::DailyRoutines", type: :request do
  include ActiveSupport::Testing::TimeHelpers
  let(:school) { create(:school) }
  let(:infantil) { create(:school_class, school: school, grade_level: "infantil_1", year: 2026, name: "A") }
  let(:fundamental) { create(:school_class, school: school, grade_level: "fundamental_i_1", year: 2026, name: "B") }
  let!(:ana) { create(:student, school: school, school_class: infantil, name: "Ana Costa") }
  let!(:bia) { create(:student, school: school, school_class: infantil, name: "Bia Nunes") }
  let!(:fundamental_child) { create(:student, school: school, school_class: fundamental, name: "Caio Reis") }
  let(:teacher_user) { create(:user, email: "carla@example.com") }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }
  let(:maths) { create(:subject, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
  let(:headers) { auth_headers_for(teacher_user) }
  let(:base) { "/api/v1/schools/#{school.id}/academics/daily_routines" }

  before do
    create(:teaching_assignment, school: school, teacher: carla, school_class: infantil, subject: maths)
    create(:teaching_assignment, school: school, teacher: carla, school_class: fundamental, subject: maths)
  end

  path "/api/v1/schools/{school_id}/academics/daily_routines" do
    parameter name: :school_id, in: :path, type: :integer

    get "List daily routines" do
      tags "Daily Routines"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "manage_academic reads drafts and keeps null fields" do
        let!(:draft) do
          create(:daily_routine, school: school, school_class: infantil, student: ana, author: carla,
                                 narrative: "Rascunho.", sleep_afternoon: nil)
        end
        let(:Authorization) { auth_headers_for(manage_academic_staff)["Authorization"] }

        run_test! do |response|
          row = JSON.parse(response.body).fetch("data").find { |card| card["id"] == draft.id }
          expect(row["status"]).to eq("draft")
          expect(row["narrative"]).to eq("Rascunho.")
          expect(row).to have_key("sleep_afternoon")
          expect(row["sleep_afternoon"]).to be_nil
        end
      end
    end

    put "Upsert a daily routine" do
      tags "Daily Routines"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          daily_routine: { type: :object }
        }
      }

      response "200", "teacher saves today's card" do
        let(:payload) do
          { daily_routine: { student_id: ana.id, date: Date.current.iso8601, narrative: "Rodinha e parque." } }
        end

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data["narrative"]).to eq("Rodinha e parque.")
          expect(data["status"]).to eq("draft")
          expect(data["student_id"]).to eq(ana.id)
          expect(Message.count).to eq(0)
        end
      end

      response "422", "a class that is not infantil" do
        let(:payload) do
          { daily_routine: { student_id: fundamental_child.id, date: Date.current.iso8601, narrative: "Não cabe." } }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_infantil")
        end
      end

      response "422", "discomfort yes needs a detail" do
        let(:payload) do
          {
            daily_routine: {
              student_id: ana.id, date: Date.current.iso8601, narrative: "Manhã.", discomfort: "yes"
            }
          }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("discomfort_detail_required")
          expect(DailyRoutine.where(student_id: ana.id)).to be_empty
        end
      end

      response "409", "a past civil date is locked" do
        let(:zone) { Time.find_zone("America/Sao_Paulo") }
        let(:payload) do
          { daily_routine: { student_id: ana.id, date: "2026-10-03", narrative: "Changed" } }
        end

        before do
          travel_to zone.local(2026, 10, 4, 15, 0, 0)
          create(:daily_routine, school: school, school_class: infantil, student: ana, author: carla,
                                 date: Date.new(2026, 10, 3), narrative: "Original")
        end

        after { travel_back }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("routine_day_locked")
          expect(DailyRoutine.find_by!(student_id: ana.id, date: Date.new(2026, 10, 3)).narrative).to eq("Original")
        end
      end

      response "403", "manage_academic cannot write" do
        let(:Authorization) { auth_headers_for(manage_academic_staff)["Authorization"] }
        let(:payload) do
          { daily_routine: { student_id: ana.id, date: Date.current.iso8601, narrative: "Coordenação." } }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/academics/daily_routines/apply_meals" do
    parameter name: :school_id, in: :path, type: :integer

    post "Fill one meal for the class" do
      tags "Daily Routines"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          school_class_id: { type: :integer },
          date: { type: :string },
          field: { type: :string },
          value: { type: :string }
        }
      }

      response "200", "fills only a null meal and does not send" do
        let!(:existing) do
          create(:daily_routine, school: school, school_class: infantil, student: ana, author: carla,
                                 date: Date.current, meal_breakfast: "great", narrative: nil)
        end
        let(:payload) do
          {
            school_class_id: infantil.id,
            date: Date.current.iso8601,
            field: "meal_breakfast",
            value: "regular"
          }
        end

        run_test! do
          expect(existing.reload.meal_breakfast).to eq("great")
          filled = DailyRoutine.find_by!(student_id: bia.id, date: Date.current)
          expect(filled.meal_breakfast).to eq("regular")
          expect(Message.count).to eq(0)
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/academics/daily_routines/{id}/send" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Send the daily routine to the family thread" do
      tags "Daily Routines"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "posts one routine message" do
        let!(:routine) do
          create(:daily_routine, school: school, school_class: infantil, student: ana, author: carla,
                                 narrative: "Dia bom.")
        end
        let(:id) { routine.id }

        run_test! do
          data = response.parsed_body.fetch("data")
          expect(data["status"]).to eq("sent")
          expect(data["sent_at"]).to be_present
          expect(Message.where(kind: "routine", daily_routine_id: routine.id).count).to eq(1)

          post "#{base}/#{routine.id}/send", headers: headers

          expect(response).to have_http_status(:conflict)
          expect(response.parsed_body.dig("error", "code")).to eq("routine_already_sent")
          expect(Message.where(kind: "routine", daily_routine_id: routine.id).count).to eq(1)
        end
      end

      response "403", "manage_academic cannot send" do
        let!(:routine) do
          create(:daily_routine, school: school, school_class: infantil, student: ana, author: carla,
                                 narrative: "Dia bom.")
        end
        let(:id) { routine.id }
        let(:Authorization) { auth_headers_for(manage_academic_staff)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
          expect(Message.count).to eq(0)
        end
      end
    end
  end

  def manage_academic_staff
    user = create(:user)
    membership = create(:membership, user: user, school: school, role: "staff")
    template = create(:school_role_template, school: school)
    create(:role_template_permission, school: school, role_template: template, permission_key: "manage_academic")
    create(:staff_profile, membership: membership, school: school, role_template: template)
    user
  end
end
