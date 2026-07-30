# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class DocumentsController < BaseController
          def index
            authorize Document

            documents = policy_scope(Document).includes(file_attachment: :blob).order(created_at: :desc)
            pagy, records = pagy(documents)

            render json: {
              data: DocumentBlueprint.render_as_hash(records, blueprint_options),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          private

          def blueprint_options
            { url_helpers: Rails.application.routes.url_helpers, full_url: false }
          end
        end
      end
    end
  end
end
