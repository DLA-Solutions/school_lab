# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::PlatformPlans", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_id) { school.id }
  let(:director) { create(:user) }
  let!(:director_membership) { create_owner_membership(school, user: director).last }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:teacher_user) { create(:user) }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let(:Authorization) { auth_headers_for(director)["Authorization"] }
  let!(:starter) do
    PlatformPlan.find_or_create_by!(key: "starter") do |row|
      row.name = "Starter"
      row.monthly_amount_cents = 29_900
    end
  end
  let!(:pro) do
    PlatformPlan.find_or_create_by!(key: "pro") do |row|
      row.name = "Pro"
      row.monthly_amount_cents = 59_900
    end
  end

  before do
    PlatformBillingSetting.instance.update!(active_provider: "fake")
    [ starter, pro ].each { |plan| ensure_platform_plan_prices(plan) }
  end

  path "/api/v1/schools/{school_id}/platform_plans" do
    parameter name: :school_id, in: :path, type: :integer

    get "List school-scoped platform plans" do
      tags "Platform Subscriptions"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "catalog listed without vendor identifiers" do
        schema type: :object,
               required: %w[data],
               properties: {
                 data: {
                   type: :array,
                   items: {
                     type: :object,
                     required: %w[key name intervals],
                     properties: {
                       key: { type: :string },
                       name: { type: :string },
                       intervals: {
                         type: :array,
                         items: {
                           type: :object,
                           required: %w[billing_interval amount_cents],
                           properties: {
                             billing_interval: { type: :string, enum: %w[month year] },
                             amount_cents: { type: :integer }
                           }
                         }
                       }
                     }
                   }
                 }
               }

        before do
          starter.platform_plan_provider_prices.find_by!(provider: "fake", billing_interval: "month")
            .update!(amount_cents: 12_345, external_price_id: "secret_starter_monthly")
          starter.platform_plan_provider_prices.where(provider: "fake", billing_interval: "year").delete_all
        end

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          keys = rows.map { |row| row["key"] }
          expect(keys).to include("starter", "pro")

          starter_row = rows.find { |row| row["key"] == "starter" }
          expect(starter_row.keys).to contain_exactly("key", "name", "intervals")
          expect(starter_row.fetch("name")).to eq("Starter")
          expect(starter_row.fetch("intervals")).to contain_exactly(
            hash_including("billing_interval" => "month", "amount_cents" => 12_345),
            hash_including("billing_interval" => "year", "amount_cents" => starter.monthly_amount_cents * 12)
          )
          expect(JSON.parse(response.body).to_json).not_to include("secret_starter_monthly")
          expect(starter_row.fetch("intervals").flat_map(&:keys).uniq).to contain_exactly(
            "billing_interval", "amount_cents"
          )
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "teacher forbidden" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "forbidden without manage_school_settings" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "cross-school" do
        let(:school_id) { other_school.id }

        run_test!
      end
    end
  end
end
