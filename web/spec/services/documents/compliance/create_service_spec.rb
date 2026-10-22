# frozen_string_literal: true

require "rails_helper"

RSpec.describe Documents::Compliance::CreateService do
  subject(:result) { described_class.call(school: school, actor: actor, params: params, file: file) }

  let(:school) { create(:school) }
  let(:actor) { create(:user) }
  let(:params) { { document_type: "sanitary_inspection" } }
  let(:file) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/sample.pdf"), "application/pdf") }

  it "stores an approved file owned by the school and sent by the actor" do
    expect(result).to be_success
    expect(result.data).to have_attributes(
      school: school, documentable: school, uploaded_by: actor, status: "approved",
      document_type: "sanitary_inspection"
    )
    expect(result.data.reviewed_at).to be_present
    expect(result.data.file).to be_attached
  end

  it "accepts images" do
    photo = Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/photo.png"), "image/png")

    expect(described_class.call(school: school, actor: actor, params: params, file: photo)).to be_success
  end

  it "keeps earlier files of the same type" do
    described_class.call(school: school, actor: actor, params: params, file: file)

    expect { result }.to change { school.documents.compliance.where(document_type: "sanitary_inspection").count }.by(1)
  end

  it "audits the upload with the actor" do
    Audited.store[:audited_user] = actor
    audit = result.data.audits.find_by(action: "create")

    expect(audit.user).to eq(actor)
  ensure
    Audited.store.delete(:audited_user)
  end

  context "with a type outside the catalog" do
    let(:params) { { document_type: "birth_certificate" } }

    it "fails with validation_error and stores nothing" do
      expect { result }.not_to change(Document, :count)
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to have_key(:document_type)
    end
  end

  context "without a file" do
    let(:file) { nil }

    it "fails with validation_error" do
      expect { result }.not_to change(Document, :count)
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to have_key(:file)
    end
  end

  context "with bytes that are not a PDF or image, whatever the name says" do
    let(:file) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/note.txt"), "application/pdf") }

    it "fails with unsupported_media_type" do
      expect { result }.not_to change(Document, :count)
      expect(result.error_code).to eq(:unsupported_media_type)
    end
  end

  context "with a file over the size limit" do
    before { stub_const("#{described_class}::MAX_FILE_BYTES", 10) }

    it "fails with file_too_large" do
      expect { result }.not_to change(Document, :count)
      expect(result.error_code).to eq(:file_too_large)
    end
  end
end
