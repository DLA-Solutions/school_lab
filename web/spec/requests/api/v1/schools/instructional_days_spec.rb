require 'rails_helper'

RSpec.describe "Api::V1::Schools::InstructionalDays", type: :request do
  describe "GET /show" do
    it "returns http success" do
      get "/api/v1/schools/instructional_days/show"
      expect(response).to have_http_status(:success)
    end
  end

  describe "GET /update" do
    it "returns http success" do
      get "/api/v1/schools/instructional_days/update"
      expect(response).to have_http_status(:success)
    end
  end

end
