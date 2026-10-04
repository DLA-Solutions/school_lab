# frozen_string_literal: true

require "rails_helper"

RSpec.describe Communication::PostMessageService do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let(:teacher) { create(:teacher, school: school, email: user.email) }
  let(:membership) { create(:membership, user: user, school: school, role: "teacher") }
  let(:school_class) { create(:school_class, school: school, grade_level: "infantil_1") }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:jpeg_bytes) { "\xFF\xD8\xFF\xD9".b }

  before { teacher }

  def uploaded(filename, content_type, bytes)
    file = Tempfile.new(filename)
    file.binmode
    file.write(bytes)
    file.rewind
    Rack::Test::UploadedFile.new(file.path, content_type, original_filename: filename)
  end

  def attach_photo
    Communication::CreateAttachmentService.call(
      school: school,
      membership: membership,
      file: uploaded("photo.jpg", "image/jpeg", jpeg_bytes)
    ).data
  end

  it "creates a conversation on the first send and reuses it on the second" do
    first = described_class.call(
      school: school, membership: membership, student: student, body: "Bom dia"
    )
    second = described_class.call(
      school: school, membership: membership, student: student, body: "Segunda mensagem"
    )

    expect(first).to be_success
    expect(second).to be_success
    expect(first.data[:created]).to be(true)
    expect(second.data[:created]).to be(true)
    expect(first.data[:message].conversation_id).to eq(second.data[:message].conversation_id)
    expect(Conversation.kept.where(school: school, student: student).count).to eq(1)
    expect(Message.where(conversation_id: first.data[:message].conversation_id).count).to eq(2)
    expect(first.data[:message].kind).to eq("text")
  end

  it "rejects an empty body when there is no attachment" do
    result = nil
    expect do
      result = described_class.call(
        school: school, membership: membership, student: student, body: "  ", attachment_ids: []
      )
    end.not_to change(Message, :count)

    expect(result).to be_failure
    expect(result.error_code).to eq(:empty_content)
    expect(Conversation.count).to eq(0)
  end

  it "accepts a nil body when an attachment is claimed" do
    attachment = attach_photo

    result = described_class.call(
      school: school, membership: membership, student: student, body: nil, attachment_ids: [ attachment.id ]
    )

    expect(result).to be_success
    expect(result.data[:message].body).to be_nil
    expect(result.data[:message].kind).to eq("text")
    expect(attachment.reload.message_id).to eq(result.data[:message].id)
  end

  it "does not insert a second message when client_request_id is repeated" do
    request_id = SecureRandom.uuid
    first = described_class.call(
      school: school, membership: membership, student: student, body: "Uma vez", client_request_id: request_id
    )
    second = described_class.call(
      school: school, membership: membership, student: student, body: "Uma vez", client_request_id: request_id
    )

    expect(second).to be_success
    expect(second.data[:created]).to be(false)
    expect(second.data[:message].id).to eq(first.data[:message].id)
    expect(Message.count).to eq(1)
  end

  it "rejects a student from another school" do
    other = create(:student)

    result = described_class.call(
      school: school, membership: membership, student: other, body: "Oi"
    )

    expect(result).to be_failure
    expect(result.error_code).to eq(:not_found)
    expect(Message.count).to eq(0)
  end
end
