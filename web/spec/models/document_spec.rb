# frozen_string_literal: true

require "rails_helper"

RSpec.describe Document, type: :model do
  subject(:document) { build(:document) }

  it "is valid with default factory" do
    expect(document).to be_valid
  end

  it "requires a document type" do
    document.document_type = nil
    expect(document).not_to be_valid
  end

  it "requires an attached file" do
    document.file.purge
    expect(document).not_to be_valid
  end

  it "starts in pending status" do
    document.save!
    expect(document.status).to eq("pending")
  end
end
