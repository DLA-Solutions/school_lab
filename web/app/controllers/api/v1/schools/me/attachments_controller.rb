# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # Same upload rules as the staff route, so a reply can carry a photo or a short clip.
        class AttachmentsController < BaseController
          def create
            return render_not_found unless policy(CommunicationAttachment).create?

            result = ::Communication::CreateAttachmentService.call(
              school: Current.school,
              membership: Current.membership,
              file: params[:file]
            )
            render_service_result(result) do |attachment|
              render json: { data: CommunicationAttachmentBlueprint.render_as_hash(attachment) }, status: :created
            end
          end

          def show
            attachment = policy_scope(CommunicationAttachment).find(params[:id])
            authorize attachment, :download?

            redirect_to rails_blob_url(attachment.file, disposition: "inline"), allow_other_host: true
          end
        end
      end
    end
  end
end
