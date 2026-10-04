# frozen_string_literal: true

# The upload the client holds until a message or a routine claims it. Bytes stay on the blob;
# this is only the id, the type, and the size.
class CommunicationAttachmentBlueprint < Blueprinter::Base
  identifier :id

  fields :content_type, :byte_size
end
