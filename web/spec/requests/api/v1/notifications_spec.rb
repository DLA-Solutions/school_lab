# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Notifications", type: :request do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let!(:membership) { create(:membership, user: user, school: school, role: "school", status: "active") }
  let(:Authorization) { auth_headers_for(user)["Authorization"] }

  path "/api/v1/notifications" do
    get "Lists the current user's notifications" do
      tags "Notifications"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns notifications newest first, with the unread count" do
        let!(:older) do
          create(:notification, user: user, school: school, created_at: 2.days.ago)
        end
        let!(:newer) do
          create(:notification, user: user, school: school, created_at: 1.hour.ago)
        end
        let!(:other_users_notification) { create(:notification, school: school) }

        run_test! do |response|
          body = JSON.parse(response.body)
          ids = body.fetch("data").map { |n| n["id"] }

          expect(ids).to eq([ newer.id, older.id ])
          expect(body.dig("meta", "unread_count")).to eq(2)
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end
    end
  end

  path "/api/v1/notifications/{id}" do
    patch "Marks one notification as read" do
      tags "Notifications"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :id, in: :path, type: :integer

      response "200", "marks it read" do
        let(:notification) { create(:notification, user: user, school: school) }
        let(:id) { notification.id }

        run_test! do |response|
          expect(notification.reload).to be_read
          body = JSON.parse(response.body)
          expect(body.dig("data", "read")).to be(true)
        end
      end

      response "404", "belonging to another user" do
        let(:id) { create(:notification, school: school).id }

        run_test!
      end
    end
  end

  path "/api/v1/notifications/mark_all_as_read" do
    post "Marks every unread notification as read" do
      tags "Notifications"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "clears the unread count" do
        let!(:first) { create(:notification, user: user, school: school) }
        let!(:second) { create(:notification, user: user, school: school) }

        run_test! do |response|
          expect(first.reload).to be_read
          expect(second.reload).to be_read
          body = JSON.parse(response.body)
          expect(body.dig("data", "unread_count")).to eq(0)
        end
      end
    end
  end
end
