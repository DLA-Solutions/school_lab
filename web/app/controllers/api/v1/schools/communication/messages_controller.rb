# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Communication
        # The path key is the student, not the conversation. The thread is created on the
        # first send, so reading it before that returns an empty page and writes nothing.
        class MessagesController < BaseController
          MESSAGE_INCLUDES = [ :communication_attachments, { daily_routine: :communication_attachments } ].freeze

          def index
            student = find_student
            return render_not_found unless policy(Conversation).visible_student?(student)

            messages = messages_for(student)
            pagy, records = pagy(messages)

            render json: {
              data: MessageBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def create
            student = find_student
            return render_not_found unless policy(Conversation).visible_student?(student)

            result = ::Communication::PostMessageService.call(
              school: Current.school,
              membership: Current.membership,
              student: student,
              body: message_params[:body],
              attachment_ids: message_params[:attachment_ids] || [],
              client_request_id: message_params[:client_request_id]
            )
            render_posted_message(result)
          end

          private

          def find_student
            Current.school.students.kept.find(params[:student_id])
          end

          def messages_for(student)
            conversation = Conversation.kept.find_by(school_id: Current.school.id, student_id: student.id)
            return Message.none if conversation.nil?

            policy_scope(Message).where(conversation_id: conversation.id)
                                 .includes(MESSAGE_INCLUDES)
                                 .order(:sent_at)
          end

          def render_posted_message(result)
            render_service_result(result) do |payload|
              message = payload.fetch(:message)
              preload_messages([ message ])
              status = payload[:created] ? :created : :ok
              render json: { data: MessageBlueprint.render_as_hash(message) }, status: status
            end
          end

          def preload_messages(messages)
            ActiveRecord::Associations::Preloader.new(records: messages, associations: MESSAGE_INCLUDES).call
          end

          def message_params
            params.permit(:body, :client_request_id, attachment_ids: [])
          end
        end
      end
    end
  end
end
