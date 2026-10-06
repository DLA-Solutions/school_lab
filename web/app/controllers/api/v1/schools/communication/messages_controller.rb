# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Communication
        class MessagesController < BaseController
          before_action :set_school_context!

          def index
            conversation = policy_scope(Conversation).includes(
              student: [ :school_class, { student_guardians: :guardian } ]
            ).find(params[:conversation_id])
            authorize conversation, :show?

            pagy, records = pagy(messages_for(conversation))
            Message.preload_sender_lines(records, conversation: conversation)

            render json: {
              data: MessageBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def create
            authorize Message

            result = ::Communication::SendMessageService.call(
              school: Current.school,
              actor_membership: Current.membership,
              student_id: message_params[:student_id],
              audience: message_params[:audience],
              teacher_id: message_params[:teacher_id],
              body: message_params[:body]
            )

            render_service_result(result, success_status: :created) do |payload|
              render json: {
                data: {
                  conversation_id: payload[:conversation].id,
                  message: MessageBlueprint.render_as_hash(payload[:message])
                }
              }, status: :created
            end
          end

          private

          def messages_for(conversation)
            conversation.messages.chronological.includes(
              sender_membership: [ :user, { staff_profile: :role_template } ]
            )
          end

          def message_params
            params.permit(:student_id, :audience, :teacher_id, :body)
          end
        end
      end
    end
  end
end
