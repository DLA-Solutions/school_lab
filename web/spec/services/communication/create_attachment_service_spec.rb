# frozen_string_literal: true

require "rails_helper"

RSpec.describe Communication::CreateAttachmentService do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let(:teacher) { create(:teacher, school: school, email: user.email) }
  let(:membership) { create(:membership, user: user, school: school, role: "teacher") }
  let(:jpeg_bytes) { "\xFF\xD8\xFF\xD9".b }

  before { teacher }

  def uploaded(filename, content_type, bytes)
    file = Tempfile.new(filename)
    file.binmode
    file.write(bytes)
    file.rewind
    Rack::Test::UploadedFile.new(file.path, content_type, original_filename: filename)
  end

  it "stores a jpeg Marcel identified, with no message and no routine" do
    upload = uploaded("photo.jpg", "text/plain", jpeg_bytes)

    result = described_class.call(school: school, membership: membership, file: upload)

    expect(result).to be_success
    attachment = result.data
    expect(attachment.school).to eq(school)
    expect(attachment.uploaded_by_membership).to eq(membership)
    expect(attachment.message_id).to be_nil
    expect(attachment.daily_routine_id).to be_nil
    expect(attachment.file.blob.content_type).to eq("image/jpeg")
    expect(attachment.byte_size).to eq(jpeg_bytes.bytesize)
  end

  it "rejects text/plain" do
    upload = uploaded("notes.txt", "text/plain", "hello")

    result = nil
    expect { result = described_class.call(school: school, membership: membership, file: upload) }
      .not_to change(CommunicationAttachment, :count)

    expect(result).to be_failure
    expect(result.error_code).to eq(:unsupported_media_type)
  end

  it "rejects an upload whose reported size is over 10 MB before saving a blob" do
    upload = uploaded("huge.jpg", "image/jpeg", jpeg_bytes)
    # The upload is the boundary. Stubbing its size avoids writing 10 MB to disk.
    allow(upload).to receive(:size).and_return(10.megabytes + 1)

    result = nil
    expect { result = described_class.call(school: school, membership: membership, file: upload) }
      .not_to change(ActiveStorage::Blob, :count)

    expect(result).to be_failure
    expect(result.error_code).to eq(:file_too_large)
  end
end
