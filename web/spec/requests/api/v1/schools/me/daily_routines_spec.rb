# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::DailyRoutines", type: :request do
  let(:school) { create(:school) }
  let(:infantil) { create(:school_class, school: school, grade_level: "infantil_1", year: 2026, name: "A") }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Maria Silva") }
  let!(:ana) { create(:student, school: school, school_class: infantil, name: "Ana Costa") }
  let!(:family) { create(:student_guardian, school: school, student: ana, guardian: guardian) }
  let(:carla) { create(:teacher, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
  let(:base) { "/api/v1/schools/#{school.id}/me/daily_routines" }

  let!(:sent) do
    create(:daily_routine, :sent,
           school: school, school_class: infantil, student: ana, author: carla,
           narrative: "Manhã tranquila.", sleep_morning: "yes", sleep_afternoon: nil)
  end
  let!(:draft) do
    create(:daily_routine,
           school: school, school_class: infantil, student: ana, author: carla,
           date: Date.current + 1, narrative: "Ainda não enviado.", status: "draft")
  end

  path "/api/v1/schools/{school_id}/me/daily_routines" do
    parameter name: :school_id, in: :path, type: :integer

    get "List sent daily routines for linked children" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "sent card omits null fields and drafts are absent" do
        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          expect(rows.map { |row| row["id"] }).to eq([ sent.id ])
          card = rows.first
          expect(card["narrative"]).to eq("Manhã tranquila.")
          expect(card["sleep_morning"]).to eq("yes")
          expect(card).not_to have_key("sleep_afternoon")
          expect(card["status"]).to eq("sent")
        end
      end
    end
  end
end
