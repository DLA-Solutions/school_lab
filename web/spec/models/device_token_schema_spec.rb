# frozen_string_literal: true

require "rails_helper"

RSpec.describe "device_tokens schema" do
  it "has user_id foreign key and partial unique index on token" do
    connection = ActiveRecord::Base.connection
    indexes = connection.indexes(:device_tokens).map(&:name)
    expect(indexes).to include("index_device_tokens_on_token_kept")

    foreign_keys = connection.foreign_keys(:device_tokens).map(&:column)
    expect(foreign_keys).to include("user_id")
  end
end
