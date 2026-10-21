# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::MinutesBooks", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_id) { school.id }
  let(:director_user) { create(:user) }
  let!(:director_membership) { staff_membership(director_user, "director") }
  let(:teacher_user) { create(:user) }
  let!(:teacher_membership) { staff_membership(teacher_user, "teacher") }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:Authorization) { auth_headers_for(director_user)["Authorization"] }

  def staff_membership(user, system_key)
    membership = create(:membership, :staff, user: user, school: school)
    template = create_system_templates_for(school).find { |t| t.system_key == system_key }
    create(:staff_profile, membership: membership, school: school, role_template: template)
    membership
  end

  book_schema = {
    type: :object,
    properties: {
      id: { type: :integer },
      name: { type: :string },
      year: { type: :integer },
      entries_count: { type: :integer },
      created_at: { type: :string, format: "date-time" },
      updated_at: { type: :string, format: "date-time" }
    }
  }

  path "/api/v1/schools/{school_id}/minutes_books" do
    parameter name: :school_id, in: :path, type: :integer

    get "List Livro Ata books" do
      tags "Minutes"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :year, in: :query, type: :integer, required: false
      parameter name: :page, in: :query, type: :integer, required: false

      response "200", "lists this school's kept books, newest year first, with entry counts" do
        schema type: :object, properties: { data: { type: :array, items: book_schema }, meta: { type: :object } }

        let!(:old_book) { create(:minutes_book, school: school, name: "Livro 2025", year: 2025) }
        let!(:current_book) { create(:minutes_book, school: school, name: "Livro 2026", year: 2026) }

        before do
          create_list(:minutes_entry, 2, school: school, minutes_book: current_book)
          create(:minutes_entry, :discarded, school: school, minutes_book: current_book)
          create(:minutes_book, :discarded, school: school)
          create(:minutes_book, school: other_school)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["data"].pluck("id")).to eq([ current_book.id, old_book.id ])
          expect(body["data"].first.keys).to contain_exactly(
            "id", "name", "year", "entries_count", "created_at", "updated_at"
          )
          expect(body["data"].first["entries_count"]).to eq(2)
          expect(body["data"].last["entries_count"]).to eq(0)
          expect(body["meta"]).to include("page" => 1, "total" => 2)
        end
      end

      response "200", "filters by year" do
        let(:year) { 2025 }
        let!(:old_book) { create(:minutes_book, school: school, year: 2025) }

        before { create(:minutes_book, school: school, year: 2026) }

        run_test! do |response|
          expect(JSON.parse(response.body)["data"].pluck("id")).to eq([ old_book.id ])
        end
      end

      response "422", "year is not a number" do
        let(:year) { "soon" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("year")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      %w[teacher guardian].each do |role|
        response "403", "forbidden for a #{role}" do
          let(:Authorization) { auth_headers_for(public_send("#{role}_user"))["Authorization"] }

          run_test! do |response|
            expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
          end
        end
      end

      response "404", "school the user does not belong to" do
        let(:school_id) { other_school.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end
    end

    post "Create a Livro Ata book" do
      tags "Minutes"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          minutes_book: { type: :object, properties: { name: { type: :string }, year: { type: :integer } } }
        },
        required: %w[minutes_book]
      }

      response "201", "creates a book in the current school" do
        schema type: :object, properties: { data: book_schema }

        let(:payload) { { minutes_book: { name: "Livro Ata 2026", year: 2026 } } }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data).to include("name" => "Livro Ata 2026", "year" => 2026, "entries_count" => 0)

          book = MinutesBook.find(data["id"])
          expect(book.school_id).to eq(school.id)
          expect(book.created_by_membership_id).to eq(director_membership.id)
        end
      end

      response "422", "the same name in the same year is refused" do
        let(:payload) { { minutes_book: { name: "Livro Ata 2026", year: 2026 } } }

        before { create(:minutes_book, school: school, name: "Livro Ata 2026", year: 2026) }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details")).to have_key("name")
          expect(MinutesBook.where(school: school).count).to eq(1)
        end
      end

      response "201", "the same name in another year or school is fine" do
        let(:payload) { { minutes_book: { name: "Livro Ata", year: 2027 } } }

        before do
          create(:minutes_book, school: school, name: "Livro Ata", year: 2026)
          create(:minutes_book, school: other_school, name: "Livro Ata", year: 2027)
        end

        run_test!
      end

      response "422", "name and year are required" do
        let(:payload) { { minutes_book: { name: "", year: nil } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details").keys).to include("name", "year")
        end
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
        let(:payload) { { minutes_book: { name: "Nope", year: 2026 } } }

        run_test! do
          expect(MinutesBook.count).to eq(0)
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }
        let(:payload) { { minutes_book: { name: "Nope", year: 2026 } } }

        run_test!
      end
    end
  end
end
