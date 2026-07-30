# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class StudentsController < BaseController
          def index
            authorize Student

            students = policy_scope(Student).order(:name)
            pagy, records = pagy(students)

            render json: {
              data: StudentBlueprint.render_as_hash(records, view: :guardian),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end
        end
      end
    end
  end
end
