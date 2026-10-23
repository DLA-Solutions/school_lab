# frozen_string_literal: true

require "rails_helper"

RSpec.describe Documents::CreateGuardianDocumentService do
  subject(:result) do
    described_class.call(school: school, guardian: guardian, actor: user, params: params, file: file)
  end

  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let!(:guardian) { create(:guardian, school: school, user: user) }
  let!(:student) { create(:student, school: school) }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:params) { { student_id: student.id, document_type: "vaccination_card" } }
  let(:file) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/sample.pdf"), "application/pdf") }

  it "stores an approved document bound to the child and sent by the current user" do
    expect(result).to be_success
    document = result.data
    expect(document).to have_attributes(
      documentable: student, uploaded_by: user, school: school, status: "approved",
      document_type: "vaccination_card"
    )
    expect(document.file).to be_attached
  end

  it "goes through the state machine: approved with a review timestamp and no review queue" do
    document = result.data.reload

    expect(document).to be_approved
    expect(document.reviewed_at).to be_present
    expect(document.rejection_reason).to be_nil
    expect(Document.where(school_id: school.id, status: "pending")).to be_empty
  end

  it "is visible to a second guardian of the same child" do
    other_user = create(:user)
    other_membership = create(:membership, user: other_user, school: school, role: "guardian")
    other = create(:guardian, school: school, user: other_user)
    create(:student_guardian, school: school, student: student, guardian: other)

    document = result.data

    Current.user = other_user
    Current.school = school
    Current.membership = other_membership
    Current.guardian = other
    expect(DocumentPolicy::Scope.new(other_user, Document).resolve).to include(document)
  ensure
    Current.reset
  end

  context "when the child is linked to another family" do
    let(:params) { { student_id: create(:student, school: school).id, document_type: "other" } }

    it "fails with not_found and stores nothing" do
      expect { result }.not_to change(Document, :count)
      expect(result.error_code).to eq(:not_found)
    end
  end

  context "when the child is in another school" do
    let(:params) { { student_id: create(:student).id, document_type: "other" } }

    it "fails with not_found" do
      expect(result.error_code).to eq(:not_found)
    end
  end

  context "when the child is no longer enrolled" do
    before { student.update!(status: "transferred") }

    it "fails with student_inactive and stores nothing" do
      expect { result }.not_to change(Document, :count)
      expect(result.error_code).to eq(:student_inactive)
    end
  end

  context "when the type is not one a guardian may send" do
    let(:params) { { student_id: student.id, document_type: "birth_certificate" } }

    it "fails with validation_error" do
      expect { result }.not_to change(Document, :count)
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to have_key(:document_type)
    end
  end

  context "without a file" do
    let(:file) { nil }

    it "fails with validation_error on file" do
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to have_key(:file)
    end
  end

  context "with a text file claiming to be a PDF" do
    let(:file) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/note.txt"), "application/pdf") }

    it "fails with unsupported_media_type" do
      expect(result.error_code).to eq(:unsupported_media_type)
    end
  end

  it "offers the types in the order the app shows them" do
    expect(Document::GUARDIAN_DOCUMENT_TYPES).to eq(
      %w[address_proof school_transcript guardian_identity vaccination_card medical_report school_transfer other]
    )
  end

  Document::GUARDIAN_DOCUMENT_TYPES.each do |type|
    context "with type #{type}" do
      let(:params) { { student_id: student.id, document_type: type } }

      it "succeeds" do
        expect(result).to be_success
      end
    end
  end

  %w[school_transcript guardian_identity].each do |type|
    context "with type #{type}" do
      let(:params) { { student_id: student.id, document_type: type } }

      it "is stored approved, bound to the child, and shared with the co-guardian" do
        other_user = create(:user)
        other_membership = create(:membership, user: other_user, school: school, role: "guardian")
        other = create(:guardian, school: school, user: other_user)
        create(:student_guardian, school: school, student: student, guardian: other)

        expect(result).to be_success
        document = result.data
        expect(document).to have_attributes(
          document_type: type, status: "approved", documentable: student, uploaded_by: user
        )

        Current.user = other_user
        Current.school = school
        Current.membership = other_membership
        Current.guardian = other
        expect(DocumentPolicy::Scope.new(other_user, Document).resolve).to include(document)
      ensure
        Current.reset
      end

      context "with a text file claiming to be a PDF" do
        let(:file) { Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/note.txt"), "application/pdf") }

        it "is refused like any other type" do
          expect(result.error_code).to eq(:unsupported_media_type)
        end
      end
    end
  end
end
