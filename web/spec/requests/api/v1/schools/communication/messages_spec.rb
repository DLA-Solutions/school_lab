# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::Messages", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:school_class) { create(:school_class, school: school, grade_level: "fundamental_i_1") }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Lara Costa") }
  let(:other_class) { create(:school_class, school: school, year: 2026) }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
  let(:portuguese) { create(:subject, school: school, name: "Português") }

  let(:guardian_user) { create(:user) }
  let(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Diego") }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:family_link) do
    create(:student_guardian, school: school, student: student, guardian: guardian, relationship: "father")
  end

  let(:other_user) { create(:user) }
  let(:other_guardian) { create(:guardian, school: school, user: other_user) }
  let(:other_child) { create(:student, school: school, school_class: school_class, name: "Other Child") }
  let!(:other_membership) { create(:membership, user: other_user, school: school, role: "guardian") }
  let!(:other_link) do
    create(:student_guardian, school: school, student: other_child, guardian: other_guardian, relationship: "mother")
  end

  let(:teacher) { create(:teacher, school: school, name: "Ana Lima") }
  let(:teacher_user) { create(:user, email: teacher.email) }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let!(:teacher_profile) do
    create(:staff_profile, membership: teacher_membership, school: school, role_template: role_templates.fetch("teacher"))
  end
  let(:teacher_b) { create(:teacher, school: school, name: "Bruno Lima") }
  let(:teacher_b_user) { create(:user, email: teacher_b.email) }
  let!(:teacher_b_membership) { create(:membership, user: teacher_b_user, school: school, role: "teacher") }
  let!(:teacher_b_profile) do
    create(:staff_profile, membership: teacher_b_membership, school: school, role_template: role_templates.fetch("teacher"))
  end
  let(:unassigned_teacher) { create(:teacher, school: school, name: "Carla Nunes") }

  let(:secretary_user) { create(:user) }
  let!(:secretary_membership) { staff_membership("secretary", secretary_user) }
  let(:coordination_user) { create(:user) }
  let!(:coordination_membership) { staff_membership("coordination", coordination_user) }
  let(:director_user) { create(:user) }
  let!(:director_membership) { staff_membership("director", director_user) }
  let(:outsider) { create(:user) }
  let!(:outsider_membership) { create(:membership, user: outsider, school: school, role: "school") }

  let(:role_templates) do
    Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
  end
  let!(:maths_assignment) do
    create(:teaching_assignment, school: school, teacher: teacher, school_class: school_class, subject: maths)
  end
  let!(:portuguese_assignment) do
    create(:teaching_assignment, school: school, teacher: teacher, school_class: school_class, subject: portuguese)
  end
  let!(:teacher_b_assignment) do
    create(:teaching_assignment, school: school, teacher: teacher_b, school_class: school_class, subject: maths)
  end
  let!(:other_class_assignment) do
    create(:teaching_assignment, school: school, teacher: unassigned_teacher, school_class: other_class, subject: maths)
  end

  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
  let(:payload) do
    { student_id: student.id, audience: "teacher", teacher_id: teacher.id, body: "Hello" }
  end

  def staff_membership(system_key, user)
    membership = create(:membership, :staff, user: user, school: school)
    create(
      :staff_profile,
      membership: membership,
      school: school,
      role_template: role_templates.fetch(system_key)
    )
    membership
  end

  def reply_on_every_audience(actor, membership)
    headers = auth_headers_for(actor)
    conversations = {
      "secretary" => create(:conversation, :secretary, school: school, student: student),
      "coordination" => create(:conversation, school: school, student: student),
      "teacher" => create(:conversation, :with_teacher, school: school, student: student, teacher: teacher)
    }

    conversations.each_value do |conversation|
      create(
        :message,
        conversation: conversation,
        school: school,
        sender_membership: guardian_membership,
        body: "Original"
      )

      get "/api/v1/schools/#{school.id}/communication/conversations/#{conversation.id}/messages", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("meta", "total")).to eq(1)

      expect {
        post "/api/v1/schools/#{school.id}/communication/messages",
             params: {
               student_id: student.id,
               audience: conversation.audience,
               teacher_id: conversation.teacher_id,
               body: "Reply from the school"
             },
             headers: headers,
             as: :json
      }.to change { conversation.messages.count }.by(1)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "conversation_id")).to eq(conversation.id)
      expect(response.parsed_body.dig("data", "message", "sender_membership_id")).to eq(membership.id)
      expect(response.parsed_body.dig("data", "message", "body")).to eq("Reply from the school")
      expect(response.parsed_body.dig("data", "message").keys).to match_array(
        %w[id sender_membership_id body sent_at]
      )
    end
  end

  path "/api/v1/schools/{school_id}/communication/messages" do
    parameter name: :school_id, in: :path, type: :integer

    post "Send a message" do
      tags "Communication"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          student_id: { type: :integer },
          audience: { type: :string, enum: %w[coordination secretary teacher] },
          teacher_id: { type: :integer, nullable: true },
          body: { type: :string }
        },
        required: %w[student_id audience body]
      }

      response "201", "a linked guardian sends and can read the message back" do
        run_test! do |post_response|
          body = JSON.parse(post_response.body).fetch("data")
          message = body.fetch("message")
          stored = Message.find(message.fetch("id"))

          expect(body["conversation_id"]).to eq(stored.conversation_id)
          expect(message).to include(
            "sender_membership_id" => guardian_membership.id,
            "body" => "Hello"
          )
          expect(message["sent_at"]).to be_present
          expect(message.keys).to match_array(%w[id sender_membership_id body sent_at])

          get "/api/v1/schools/#{school.id}/communication/conversations/#{body.fetch("conversation_id")}/messages",
              headers: auth_headers_for(guardian_user)

          expect(response).to have_http_status(:ok)
          listed = response.parsed_body.fetch("data")
          expect(listed.map { |row| row["id"] }).to eq([ stored.id ])
          expect(listed.first.keys).to match_array(%w[id sender_membership_id body sent_at])
        end
      end

      response "201", "a second send to the same child and teacher appends" do
        let(:payload) do
          { student_id: student.id, audience: "teacher", teacher_id: teacher.id, body: "Second" }
        end

        before do
          post "/api/v1/schools/#{school.id}/communication/messages",
               params: { student_id: student.id, audience: "teacher", teacher_id: teacher.id, body: "First" },
               headers: auth_headers_for(guardian_user),
               as: :json
          @first_conversation_id = response.parsed_body.fetch("data").fetch("conversation_id")
        end

        run_test! do |post_response|
          body = JSON.parse(post_response.body).fetch("data")

          expect(body["conversation_id"]).to eq(@first_conversation_id)
          expect(
            Conversation.where(school: school, student: student, audience: "teacher", teacher_id: teacher.id).count
          ).to eq(1)
          expect(Message.where(conversation_id: @first_conversation_id).pluck(:body)).to contain_exactly(
            "First", "Second"
          )
        end
      end

      response "422", "blank body" do
        let(:payload) { { student_id: student.id, audience: "secretary", body: "   " } }
        let!(:conversation_count) { Conversation.count }
        let!(:message_count) { Message.count }

        run_test! do |post_response|
          body = JSON.parse(post_response.body)

          expect(body.dig("error", "code")).to eq("empty_content")
          expect(body.dig("error", "message")).to be_present
          expect(body.dig("error", "details")).to eq({})
          expect(Conversation.count).to eq(conversation_count)
          expect(Message.count).to eq(message_count)
        end
      end

      response "422", "teacher is not assigned to the child's current class" do
        let(:payload) do
          { student_id: student.id, audience: "teacher", teacher_id: unassigned_teacher.id, body: "Hello" }
        end
        let!(:conversation_count) { Conversation.count }
        let!(:message_count) { Message.count }

        run_test! do |post_response|
          body = JSON.parse(post_response.body)

          expect(body.dig("error", "code")).to eq("teacher_not_assigned")
          expect(body.dig("error", "details")).to eq({})
          expect(Conversation.count).to eq(conversation_count)
          expect(Message.count).to eq(message_count)
        end
      end

      response "403", "a school role without an inbox cannot send" do
        let(:Authorization) { auth_headers_for(outsider)["Authorization"] }

        run_test! do |post_response|
          expect(JSON.parse(post_response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test! do |post_response|
          expect(JSON.parse(post_response.body).dig("error", "code")).to eq("unauthorized")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/communication/conversations/{conversation_id}/messages" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :conversation_id, in: :path, type: :integer

    get "List messages in a conversation" do
      tags "Communication"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "the linked guardian reads messages in sent_at order" do
        let!(:conversation) { create(:conversation, :secretary, school: school, student: student) }
        let(:conversation_id) { conversation.id }
        let!(:older) do
          create(
            :message,
            conversation: conversation,
            school: school,
            sender_membership: guardian_membership,
            body: "First",
            sent_at: 2.hours.ago
          )
        end
        let!(:newer) do
          create(
            :message,
            conversation: conversation,
            school: school,
            sender_membership: guardian_membership,
            body: "Second",
            sent_at: 1.hour.ago
          )
        end

        run_test! do |response|
          body = JSON.parse(response.body)

          expect(body.fetch("data").map { |row| row["body"] }).to eq(%w[First Second])
          expect(body.dig("meta", "page")).to eq(1)
          expect(body.dig("meta", "total")).to eq(2)
          expect(body.dig("meta", "per_page")).to be_present
          expect(body.fetch("data").first).to include(
            "id" => older.id,
            "sender_membership_id" => guardian_membership.id,
            "body" => "First"
          )
          expect(body.fetch("data").first.keys).to match_array(
            %w[id sender_membership_id body sent_at]
          )
        end
      end

      response "200", "secretary reads a secretary conversation" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }
        let!(:conversation) { create(:conversation, :secretary, school: school, student: student) }
        let(:conversation_id) { conversation.id }

        run_test! do |response|
          expect(response).to have_http_status(:ok)
          expect(JSON.parse(response.body)).to include("data", "meta")
        end
      end

      response "404", "another family" do
        let(:Authorization) { auth_headers_for(other_user)["Authorization"] }
        let(:conversation_id) do
          create(:conversation, :with_teacher, school: school, student: student, teacher: teacher).id
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "404", "secretary cannot read a teacher conversation" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }
        let(:conversation_id) do
          create(:conversation, :with_teacher, school: school, student: student, teacher: teacher).id
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "404", "another teacher" do
        let(:Authorization) { auth_headers_for(teacher_b_user)["Authorization"] }
        let(:conversation_id) do
          create(:conversation, :with_teacher, school: school, student: student, teacher: teacher).id
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "404", "another school" do
        let(:conversation_id) { create(:conversation).id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }
        let(:conversation_id) { create(:conversation, school: school, student: student).id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("unauthorized")
        end
      end
    end
  end

  it "lets coordination read and reply on secretary, coordination, and teacher conversations" do
    reply_on_every_audience(coordination_user, coordination_membership)
  end

  it "lets the director read and reply on secretary, coordination, and teacher conversations" do
    reply_on_every_audience(director_user, director_membership)
  end
end
