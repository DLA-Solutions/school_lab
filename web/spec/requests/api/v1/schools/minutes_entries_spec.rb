# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::MinutesEntries", type: :request do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_id) { school.id }
  let(:director_user) { create(:user) }
  let!(:director_membership) { staff_membership(director_user, "director") }
  let(:secretary_user) { create(:user) }
  let(:teacher_user) { create(:user) }
  let!(:teacher_membership) { staff_membership(teacher_user, "teacher") }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:Authorization) { auth_headers_for(director_user)["Authorization"] }
  let(:book) { create(:minutes_book, school: school, name: "Livro 2026", year: 2026) }
  let!(:signature_provider) { create(:school_signature_provider, school: school) }

  def staff_membership(user, system_key)
    membership = create(:membership, :staff, user: user, school: school)
    template = create_system_templates_for(school).find { |t| t.system_key == system_key }
    create(:staff_profile, membership: membership, school: school, role_template: template)
    membership
  end

  participant_list_schema = {
    type: :array,
    items: {
      type: :object,
      properties: {
        id: { type: :integer }, name: { type: :string }, role_label: { type: :string, nullable: true },
        signs: { type: :boolean }
      }
    }
  }

  summary_schema = {
    type: :object,
    properties: {
      id: { type: :integer }, minutes_book_id: { type: :integer },
      school_class_id: { type: :integer, nullable: true },
      kind: { type: :string, enum: %w[meeting class_council final_results] },
      title: { type: :string }, held_on: { type: :string, format: :date },
      status: { type: :string, enum: %w[draft pending_signature signed cancelled] },
      book: { type: :object, properties: { id: { type: :integer }, name: { type: :string }, year: { type: :integer } } },
      participants: participant_list_schema
    }
  }

  detail_schema = {
    type: :object,
    properties: {
      id: { type: :integer }, minutes_book_id: { type: :integer },
      school_class_id: { type: :integer, nullable: true },
      kind: { type: :string }, title: { type: :string }, held_on: { type: :string, format: :date },
      body: { type: :string, nullable: true }, status: { type: :string },
      sent_to_provider: { type: :boolean }, has_signed_pdf: { type: :boolean },
      participants: {
        type: :array,
        items: {
          type: :object,
          properties: {
            id: { type: :integer }, name: { type: :string }, role_label: { type: :string, nullable: true },
            email: { type: :string, nullable: true }, cpf: { type: :string, nullable: true, description: "Masked" },
            signs: { type: :boolean }, signed_at: { type: :string, nullable: true },
            membership_id: { type: :integer, nullable: true }, guardian_id: { type: :integer, nullable: true },
            student_id: { type: :integer, nullable: true }
          }
        }
      }
    }
  }

  participant_input = {
    type: :object,
    properties: {
      name: { type: :string }, role_label: { type: :string }, email: { type: :string }, cpf: { type: :string },
      signs: { type: :boolean }, membership_id: { type: :integer }, guardian_id: { type: :integer },
      student_id: { type: :integer }
    },
    required: %w[name]
  }

  entry_input = lambda { |extra = {}|
    {
      type: :object,
      properties: {
        minutes_entry: {
          type: :object,
          properties: {
            minutes_book_id: { type: :integer },
            kind: { type: :string, enum: %w[meeting class_council final_results] },
            title: { type: :string }, held_on: { type: :string, format: :date }, body: { type: :string },
            school_class_id: { type: :integer },
            participants: { type: :array, items: participant_input }
          }.merge(extra)
        }
      },
      required: %w[minutes_entry]
    }
  }

  signer_cpf = "52998224725"

  path "/api/v1/schools/{school_id}/minutes_entries" do
    parameter name: :school_id, in: :path, type: :integer

    get "List and search minutes entries" do
      tags "Minutes"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :q, in: :query, type: :string, required: false,
                description: "Participant name — case and accent insensitive substring"
      parameter name: :year, in: :query, type: :integer, required: false, description: "The book's year"
      parameter name: :kind, in: :query, type: :string, required: false
      parameter name: :status, in: :query, type: :string, required: false
      parameter name: :minutes_book_id, in: :query, type: :integer, required: false
      parameter name: :page, in: :query, type: :integer, required: false

      response "200", "lists this school's kept entries, newest first, without participant contact data" do
        schema type: :object, properties: { data: { type: :array, items: summary_schema }, meta: { type: :object } }

        let!(:older) { create(:minutes_entry, school: school, minutes_book: book, held_on: Date.new(2026, 2, 1)) }
        let!(:newer) { create(:minutes_entry, :with_signers, school: school, minutes_book: book, held_on: Date.new(2026, 5, 1)) }

        before do
          create(:minutes_entry, school: other_school)
          create(:minutes_entry, :discarded, school: school)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["data"].pluck("id")).to eq([ newer.id, older.id ])
          expect(body["meta"]).to include("page" => 1, "total" => 2)

          participant = body["data"].first["participants"].first
          expect(participant.keys).to contain_exactly("id", "name", "role_label", "signs")
          expect(body["data"].first).not_to have_key("body")
          expect(response.body).not_to include(newer.minutes_participants.first.cpf)
        end
      end

      response "200", "searches by participant name ignoring case and accents" do
        let(:q) { "jose" }
        let!(:match) { create(:minutes_entry, school: school, minutes_book: book) }

        before do
          create(:minutes_participant, school: school, minutes_entry: match, name: "José da Silva")
          other = create(:minutes_entry, school: school, minutes_book: book)
          create(:minutes_participant, school: school, minutes_entry: other, name: "Maria")
          foreign = create(:minutes_entry, school: other_school)
          create(:minutes_participant, school: other_school, minutes_entry: foreign, name: "José Foreign")
        end

        run_test! do |response|
          expect(JSON.parse(response.body)["data"].pluck("id")).to eq([ match.id ])
        end
      end

      response "200", "filters by the book's year" do
        let(:year) { 2025 }
        let!(:old_book_entry) do
          create(:minutes_entry, school: school, minutes_book: create(:minutes_book, school: school, year: 2025))
        end

        before { create(:minutes_entry, school: school, minutes_book: book) }

        run_test! do |response|
          expect(JSON.parse(response.body)["data"].pluck("id")).to eq([ old_book_entry.id ])
        end
      end

      response "200", "filters by kind" do
        let(:kind) { "final_results" }
        let!(:final) { create(:minutes_entry, :final_results, school: school, minutes_book: book) }

        before { create(:minutes_entry, school: school, minutes_book: book) }

        run_test! do |response|
          expect(JSON.parse(response.body)["data"].pluck("id")).to eq([ final.id ])
        end
      end

      response "200", "filters by status" do
        let(:status) { "signed" }
        let!(:signed) { create(:minutes_entry, :signed, school: school, minutes_book: book) }

        before { create(:minutes_entry, school: school, minutes_book: book) }

        run_test! do |response|
          expect(JSON.parse(response.body)["data"].pluck("id")).to eq([ signed.id ])
        end
      end

      response "200", "filters by book" do
        let(:minutes_book_id) { book.id }
        let!(:inside) { create(:minutes_entry, school: school, minutes_book: book) }

        before { create(:minutes_entry, school: school) }

        run_test! do |response|
          expect(JSON.parse(response.body)["data"].pluck("id")).to eq([ inside.id ])
        end
      end

      response "200", "never lists another school's book even when asked for by id" do
        let(:minutes_book_id) { foreign_book.id }
        let(:foreign_book) { create(:minutes_book, school: other_school) }

        before { create(:minutes_entry, school: other_school, minutes_book: foreign_book) }

        run_test! do |response|
          expect(JSON.parse(response.body)["data"]).to be_empty
        end
      end

      response "422", "unknown kind" do
        let(:kind) { "gossip" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("kind")
        end
      end

      response "422", "unknown status" do
        let(:status) { "published" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("status")
        end
      end

      response "422", "year is not a number" do
        let(:year) { "x" }

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

        run_test!
      end
    end

    post "Create a minutes entry (draft)" do
      tags "Minutes"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: entry_input.call

      let(:guardian_record) { create(:guardian, school: school) }
      let(:base_attributes) do
        {
          minutes_book_id: book.id, kind: "meeting", title: "Reunião de pais", held_on: "2026-03-10",
          body: "<h2>Pauta</h2><p>Calendário <strong>2026</strong></p><script>alert(1)</script>",
          participants: [
            { name: "Ana Souza", role_label: "Diretora", email: "ana@example.com", cpf: signer_cpf, signs: true },
            { name: "Beto Lima", role_label: "Responsável", guardian_id: guardian_record.id }
          ]
        }
      end
      let(:payload) { { minutes_entry: base_attributes } }

      response "201", "creates a draft with its participants and a sanitized body" do
        schema type: :object, properties: { data: detail_schema }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data).to include("kind" => "meeting", "status" => "draft", "title" => "Reunião de pais",
                                  "school_id" => school.id, "sent_to_provider" => false,
                                  "has_signed_pdf" => false)
          expect(data["body"]).to include("<h2>Pauta</h2>")
          expect(data["body"]).not_to include("script")
          expect(data["participants"].pluck("name")).to eq([ "Ana Souza", "Beto Lima" ])

          # Detail masks the CPF; the full document never leaves the server.
          expect(data["participants"].first["cpf"]).to eq("***.982.247-**")
          expect(response.body).not_to include(signer_cpf)
          expect(data["participants"].last["guardian_id"]).to eq(guardian_record.id)

          entry = MinutesEntry.find(data["id"])
          expect(entry).to have_attributes(school_id: school.id, created_by_membership_id: director_membership.id)
          expect(entry.minutes_participants.first.cpf).to eq(signer_cpf)
        end
      end

      response "201", "a class council may name a class of the school" do
        let(:school_class) { create(:school_class, school: school) }
        let(:payload) do
          { minutes_entry: base_attributes.merge(kind: "class_council", school_class_id: school_class.id) }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "school_class_id")).to eq(school_class.id)
        end
      end

      response "201", "a secretary may create too" do
        let(:Authorization) do
          user = create(:user)
          staff_membership(user, "secretary")
          auth_headers_for(user)["Authorization"]
        end

        run_test!
      end

      response "422", "another school's book is refused" do
        let(:payload) { { minutes_entry: base_attributes.merge(minutes_book_id: create(:minutes_book, school: other_school).id) } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("minutes_book")
          expect(MinutesEntry.count).to eq(0)
        end
      end

      response "422", "a class on a meeting is refused" do
        let(:payload) do
          { minutes_entry: base_attributes.merge(school_class_id: create(:school_class, school: school).id) }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("school_class")
        end
      end

      response "422", "another school's class is refused" do
        let(:payload) do
          { minutes_entry: base_attributes.merge(kind: "class_council", school_class_id: create(:school_class).id) }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("school_class")
        end
      end

      response "422", "title, kind and date are validated" do
        let(:payload) { { minutes_entry: base_attributes.merge(title: "", kind: "other", held_on: nil) } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details").keys).to include("title", "kind", "held_on")
        end
      end

      response "422", "participant errors are indexed and nothing is saved" do
        let(:payload) do
          { minutes_entry: base_attributes.merge(participants: [ { name: "" }, { name: "Ok", cpf: "123" } ]) }
        end

        run_test! do |response|
          details = JSON.parse(response.body).dig("error", "details")
          expect(details.keys).to include("participants.0.name", "participants.1.cpf")
          expect(MinutesEntry.count).to eq(0)
          expect(MinutesParticipant.count).to eq(0)
        end
      end

      response "422", "a student can never be a signer" do
        let(:student) { create(:student, school: school) }
        let(:payload) do
          { minutes_entry: base_attributes.merge(participants: [ { name: "Kid", student_id: student.id, signs: true } ]) }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("participants.0.signs")
        end
      end

      response "422", "a person of another school cannot be linked" do
        let(:payload) do
          { minutes_entry: base_attributes.merge(participants: [ { name: "Foreign", guardian_id: create(:guardian).id } ]) }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("participants.0.base")
        end
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        run_test! do
          expect(MinutesEntry.count).to eq(0)
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/minutes_entries/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    let(:entry) { create(:minutes_entry, :with_signers, school: school, minutes_book: book) }
    let(:id) { entry.id }

    get "Show a minutes entry" do
      tags "Minutes"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns the detail with masked CPFs" do
        schema type: :object, properties: { data: detail_schema }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data["id"]).to eq(entry.id)
          expect(data["body"]).to be_present
          expect(data["participants"].size).to eq(2)
          expect(data["participants"].first["cpf"]).to match(/\A\*\*\*\.\d{3}\.\d{3}-\*\*\z/)
          expect(data["participants"].first["email"]).to be_present
          expect(response.body).not_to include(entry.minutes_participants.first.cpf)
          expect(data).not_to have_key("provider_document_id")
          expect(data).not_to have_key("signed_document_url")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        run_test!
      end

      response "403", "forbidden for a guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test!
      end

      response "404", "entry of another school" do
        let(:entry) { create(:minutes_entry, school: other_school) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "404", "discarded entry" do
        let(:entry) { create(:minutes_entry, :discarded, school: school, minutes_book: book) }

        run_test!
      end
    end

    patch "Edit a draft minutes entry" do
      tags "Minutes"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: entry_input.call

      response "200", "updates fields and replaces the participants" do
        schema type: :object, properties: { data: detail_schema }

        let(:payload) do
          { minutes_entry: { title: "Renamed", body: "<p>New</p>", participants: [ { name: "Only One" } ] } }
        end

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data).to include("title" => "Renamed", "body" => "<p>New</p>")
          expect(data["participants"].pluck("name")).to eq([ "Only One" ])
          expect(entry.reload.minutes_participants.count).to eq(1)
        end
      end

      response "200", "leaves the participants alone when they are not sent" do
        let(:payload) { { minutes_entry: { title: "Renamed" } } }

        run_test! do
          expect(entry.reload.title).to eq("Renamed")
          expect(entry.minutes_participants.count).to eq(2)
        end
      end

      response "200", "ignores an attempt to change the kind" do
        let(:payload) { { minutes_entry: { kind: "final_results", title: "Renamed" } } }

        run_test! do
          expect(entry.reload.kind).to eq("meeting")
        end
      end

      response "422", "validation failure keeps the participants" do
        let(:payload) { { minutes_entry: { title: "", participants: [ { name: "Only One" } ] } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("title")
          expect(entry.reload.minutes_participants.count).to eq(2)
        end
      end

      %w[pending_signature signed cancelled].each do |state|
        response "409", "a #{state} entry cannot be edited" do
          let(:entry) { create(:minutes_entry, state.to_sym, school: school, minutes_book: book) }
          let(:payload) { { minutes_entry: { title: "Sneaky" } } }

          run_test! do |response|
            expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_state_transition")
            expect(entry.reload.title).not_to eq("Sneaky")
          end
        end
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
        let(:payload) { { minutes_entry: { title: "Hacked" } } }

        run_test! do
          expect(entry.reload.title).not_to eq("Hacked")
        end
      end

      response "404", "entry of another school" do
        let(:entry) { create(:minutes_entry, school: other_school, title: "Foreign") }
        let(:payload) { { minutes_entry: { title: "Hacked" } } }

        run_test! do
          expect(entry.reload.title).to eq("Foreign")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }
        let(:payload) { { minutes_entry: { title: "x" } } }

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/minutes_entries/{id}/pdf" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    let(:entry) { create(:minutes_entry, :with_signers, school: school, minutes_book: book) }
    let(:id) { entry.id }

    get "Preview, or download the signed copy of, a minutes entry" do
      tags "Minutes"
      produces "application/pdf", "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "renders a preview of a draft" do
        run_test! do |response|
          expect(response.content_type).to include("application/pdf")
          expect(response.body).to start_with("%PDF")
        end
      end

      response "200", "serves the stored signed copy of a signed entry" do
        let(:entry) { create(:minutes_entry, :signed, school: school, minutes_book: book) }

        before do
          entry.pdf.attach(io: StringIO.new("%PDF-1.4 signed"), filename: "signed.pdf", content_type: "application/pdf")
        end

        run_test! do |response|
          expect(response.body).to eq("%PDF-1.4 signed")
        end
      end

      response "200", "fetches the signed copy from the provider when it is not stored yet" do
        let(:entry) do
          create(:minutes_entry, :signed, school: school, minutes_book: book,
                                          signed_document_url: "https://autentique.example/doc/assinado.pdf")
        end

        before do
          stub_request(:get, "https://autentique.example/doc/assinado.pdf")
            .to_return(status: 200, body: "%PDF-1.4 from provider")
        end

        run_test! do |response|
          expect(response.body).to eq("%PDF-1.4 from provider")
          expect(entry.reload.pdf).to be_attached
        end
      end

      response "404", "signed but no copy is known yet" do
        let(:entry) { create(:minutes_entry, :signed, school: school, minutes_book: book) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "502", "the provider cannot serve the signed copy" do
        let(:entry) do
          create(:minutes_entry, :signed, school: school, minutes_book: book,
                                          signed_document_url: "https://autentique.example/doc/assinado.pdf")
        end

        before { stub_request(:get, "https://autentique.example/doc/assinado.pdf").to_return(status: 500) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("provider_error")
        end
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        run_test!
      end

      response "404", "entry of another school" do
        let(:entry) { create(:minutes_entry, school: other_school) }

        run_test!
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/minutes_entries/{id}/send_for_signature" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    let(:entry) { create(:minutes_entry, :with_signers, school: school, minutes_book: book) }
    let(:id) { entry.id }

    post "Send a draft for signature" do
      tags "Minutes"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "creates the provider document and moves the entry to pending_signature" do
        schema type: :object, properties: { data: detail_schema }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data).to include("status" => "pending_signature", "sent_to_provider" => true)
          expect(entry.reload).to have_attributes(
            status: "pending_signature", signature_provider: "fake", signature_requested_at: be_present
          )
          expect(entry.provider_document_id).to start_with("fake-doc-")
        end
      end

      response "422", "no participant is a signer" do
        let(:entry) { create(:minutes_entry, school: school, minutes_book: book) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details", "base").first).to be_present
          expect(entry.reload).to be_draft
        end
      end

      response "422", "a signer without e-mail or CPF is named and nothing is sent" do
        let(:entry) do
          create(:minutes_entry, school: school, minutes_book: book).tap do |record|
            create(:minutes_participant, :signer, school: school, minutes_entry: record)
            create(:minutes_participant, school: school, minutes_entry: record, name: "Carla Sem Email", signs: true)
          end
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details", "base").first).to include("Carla Sem Email")
          expect(entry.reload).to be_draft
          expect(entry.provider_document_id).to be_nil
        end
      end

      response "422", "the school has no signature integration" do
        before { SchoolSignatureProvider.where(school: school).delete_all }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
          expect(entry.reload).to be_draft
        end
      end

      response "502", "the provider is unavailable and the entry stays a draft" do
        before do
          adapter = instance_double(Gateways::Signature::Fake)
          allow(adapter).to receive(:create_document).and_raise(Gateways::Signature::TransientError, "down")
          allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("provider_error")
          expect(entry.reload).to be_draft
          expect(entry.provider_document_id).to be_nil
        end
      end

      %w[pending_signature signed cancelled].each do |state|
        response "409", "a #{state} entry cannot be sent" do
          let(:entry) { create(:minutes_entry, state.to_sym, school: school, minutes_book: book) }

          run_test! do |response|
            expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_state_transition")
          end
        end
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        run_test! do
          expect(entry.reload).to be_draft
        end
      end

      response "404", "entry of another school" do
        let(:entry) { create(:minutes_entry, :with_signers, school: other_school) }

        run_test!
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/minutes_entries/{id}/cancel" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    let(:entry) { create(:minutes_entry, school: school, minutes_book: book) }
    let(:id) { entry.id }

    post "Cancel a draft or pending entry" do
      tags "Minutes"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "cancels a draft without touching the provider" do
        schema type: :object, properties: { data: detail_schema }

        before { allow(Gateways::Signature::Registry).to receive(:resolve).and_call_original }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "status")).to eq("cancelled")
          expect(entry.reload.cancelled_at).to be_present
          expect(Gateways::Signature::Registry).not_to have_received(:resolve)
        end
      end

      response "200", "withdraws a pending entry from the provider, then cancels it" do
        let(:entry) { create(:minutes_entry, :pending_signature, school: school, minutes_book: book) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "status")).to eq("cancelled")
        end
      end

      response "502", "a provider failure leaves a pending entry pending" do
        let(:entry) { create(:minutes_entry, :pending_signature, school: school, minutes_book: book) }

        before do
          adapter = instance_double(Gateways::Signature::Fake)
          allow(adapter).to receive(:cancel_document).and_raise(Gateways::Signature::TransientError, "down")
          allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("provider_error")
          expect(entry.reload).to be_pending_signature
        end
      end

      %w[signed cancelled].each do |state|
        response "409", "a #{state} entry cannot be cancelled" do
          let(:entry) { create(:minutes_entry, state.to_sym, school: school, minutes_book: book) }

          run_test! do |response|
            expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_state_transition")
            expect(entry.reload.status).to eq(state)
          end
        end
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        run_test! do
          expect(entry.reload).to be_draft
        end
      end

      response "404", "entry of another school" do
        let(:entry) { create(:minutes_entry, school: other_school) }

        run_test! do
          expect(entry.reload).to be_draft
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end
    end
  end
end
