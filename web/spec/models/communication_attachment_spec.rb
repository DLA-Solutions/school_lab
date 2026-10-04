# frozen_string_literal: true

require "rails_helper"

RSpec.describe CommunicationAttachment, type: :model do
  it "is valid with an allowed file and no owner yet" do
    expect(build(:communication_attachment)).to be_valid
  end

  it "rejects a file outside the allow-list" do
    attachment = build(:communication_attachment)
    blob = ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new("plain"),
      filename: "notes.txt",
      content_type: "text/plain",
      identify: false
    )
    attachment.file.attach(blob)

    expect(attachment).not_to be_valid
    expect(attachment.errors[:file]).to be_present
  end

  it "rejects a file over 10 MB" do
    attachment = build(:communication_attachment)
    attachment.file.blob.update!(byte_size: 10.megabytes + 1)

    expect(attachment).not_to be_valid
    expect(attachment.errors[:file]).to be_present
  end

  it "rejects an attachment claimed by both a message and a routine" do
    school = create(:school)
    message = create(:message, school: school, conversation: create(:conversation, school: school))
    routine = create(:daily_routine, school: school)
    attachment = build(:communication_attachment, school: school, message: message, daily_routine: routine,
                                                  uploaded_by_membership: message.sender_membership)

    expect(attachment).not_to be_valid
  end
end
