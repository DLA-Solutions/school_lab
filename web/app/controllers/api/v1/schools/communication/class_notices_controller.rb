# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Communication
        # One text copied into each enrolled child's own thread. Coordination without a
        # teaching assignment cannot broadcast one.
        class ClassNoticesController < BaseController
          MESSAGE_INCLUDES = [ :communication_attachments, { daily_routine: :communication_attachments } ].freeze

          def create
            school_class = Current.school.school_classes.kept.find(notice_params[:school_class_id])
            return render_not_found unless policy(Conversation).class_notice?(school_class)

            result = ::Communication::PostClassNoticeService.call(
              school: Current.school,
              membership: Current.membership,
              school_class: school_class,
              body: notice_params[:body],
              attachment_ids: notice_params[:attachment_ids] || [],
              client_request_id: notice_params[:client_request_id]
            )
            render_posted_messages(result)
          end

          private

          def render_posted_messages(result)
            render_service_result(result) do |payload|
              messages = payload.fetch(:messages)
              ActiveRecord::Associations::Preloader.new(records: messages, associations: MESSAGE_INCLUDES).call
              status = payload[:created] ? :created : :ok
              render json: { data: MessageBlueprint.render_as_hash(messages) }, status: status
            end
          end

          def notice_params
            params.permit(:school_class_id, :body, :client_request_id, attachment_ids: [])
          end
        end
      end
    end
  end
end
