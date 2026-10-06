# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Communication
        class ConversationsController < BaseController
          before_action :set_school_context!

          def index
            authorize Conversation

            conversations = policy_scope(Conversation).includes(
              :teacher,
              student: [ :school_class, { student_guardians: :guardian } ]
            ).recent_first
            conversations = conversations.where(audience: params[:audience]) if params[:audience].present?
            pagy, records = pagy(conversations)
            Conversation.preload_inbox_fields(records)

            render json: {
              data: ConversationBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end
        end
      end
    end
  end
end
