# frozen_string_literal: true

require "rails_helper"

RSpec.describe Communication::PostClassNoticeService do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let(:teacher) { create(:teacher, school: school, email: user.email) }
  let(:membership) { create(:membership, user: user, school: school, role: "teacher") }
  let(:school_class) { create(:school_class, school: school, grade_level: "infantil_1") }
  let(:jpeg_bytes) { "\xFF\xD8\xFF\xD9".b }

  before { teacher }

  def uploaded(filename, content_type, bytes)
    file = Tempfile.new(filename)
    file.binmode
    file.write(bytes)
    file.rewind
    Rack::Test::UploadedFile.new(file.path, content_type, original_filename: filename)
  end

  it "writes one message per enrolled active student, each on that child's thread" do
    first_child = create(:student, school: school, school_class: school_class)
    second_child = create(:student, school: school, school_class: school_class)
    create(:student, school: school, school_class: school_class, status: "transferred")
    discarded = create(:student, school: school, school_class: school_class)
    discarded.discard

    result = described_class.call(
      school: school,
      membership: membership,
      school_class: school_class,
      body: "Amanhã teremos passeio."
    )

    expect(result).to be_success
    expect(result.data[:created]).to be(true)
    messages = result.data[:messages]
    expect(messages.map { |message| message.conversation.student_id }).to eq([ first_child.id, second_child.id ].sort)
    expect(messages.map(&:conversation_id).uniq.size).to eq(2)
    expect(messages.map(&:kind)).to all(eq("text"))
    expect(Conversation.kept.count).to eq(2)
  end

  it "does not duplicate messages when client_request_id is repeated" do
    create(:student, school: school, school_class: school_class)
    create(:student, school: school, school_class: school_class)
    request_id = SecureRandom.uuid

    first = described_class.call(
      school: school, membership: membership, school_class: school_class,
      body: "Passeio", client_request_id: request_id
    )
    second = described_class.call(
      school: school, membership: membership, school_class: school_class,
      body: "Passeio", client_request_id: request_id
    )

    expect(second).to be_success
    expect(second.data[:created]).to be(false)
    expect(second.data[:messages].map(&:id)).to eq(first.data[:messages].map(&:id))
    expect(Message.count).to eq(2)
  end

  it "keeps two families on different conversations" do
    first_child = create(:student, school: school, school_class: school_class)
    second_child = create(:student, school: school, school_class: school_class)

    result = described_class.call(
      school: school, membership: membership, school_class: school_class, body: "Recado"
    )

    conversations = result.data[:messages].map(&:conversation)
    expect(conversations.map(&:student_id)).to contain_exactly(first_child.id, second_child.id)
    expect(conversations.map(&:id).uniq.size).to eq(2)
  end

  it "claims the original upload on the first child and shares the blob with the next" do
    create(:student, school: school, school_class: school_class)
    create(:student, school: school, school_class: school_class)
    attachment = Communication::CreateAttachmentService.call(
      school: school,
      membership: membership,
      file: uploaded("photo.jpg", "image/jpeg", jpeg_bytes)
    ).data
    request_id = SecureRandom.uuid

    result = described_class.call(
      school: school, membership: membership, school_class: school_class,
      body: "Foto da rodinha", attachment_ids: [ attachment.id ], client_request_id: request_id
    )

    messages = result.data[:messages]
    rows = CommunicationAttachment.where(message_id: messages.map(&:id))
    expect(rows.size).to eq(2)
    expect(rows.map { |row| row.file.blob_id }.uniq).to eq([ attachment.file.blob_id ])
    expect(attachment.reload.message_id).to eq(messages.min_by { |message| message.conversation.student_id }.id)

    late_child = create(:student, school: school, school_class: school_class)
    retry_result = described_class.call(
      school: school, membership: membership, school_class: school_class,
      body: "Foto da rodinha", attachment_ids: [ attachment.id ], client_request_id: request_id
    )

    expect(retry_result.data[:created]).to be(true)
    expect(retry_result.data[:messages].size).to eq(3)
    expect(Message.count).to eq(3)
    late_message = retry_result.data[:messages].find { |message| message.conversation.student_id == late_child.id }
    expect(late_message.communication_attachments.map { |row| row.file.blob_id }).to eq([ attachment.file.blob_id ])
    expect(CommunicationAttachment.where(message_id: retry_result.data[:messages].map(&:id)).count).to eq(3)
  end
end
