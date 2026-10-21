# frozen_string_literal: true

# Every upload goes through the API as multipart (services own validation, size and type limits).
# The stock direct-upload endpoint would let an unauthenticated caller mint blobs and presigned
# PUT URLs against the private bucket, so it answers 404.
Rails.application.config.to_prepare do
  ActiveStorage::DirectUploadsController.before_action { head :not_found }
end
