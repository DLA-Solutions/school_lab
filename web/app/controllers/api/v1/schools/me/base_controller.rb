# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class BaseController < Api::V1::Schools::BaseController
          before_action :require_guardian_context!

          private

          def require_guardian_context!
            unless Current.membership&.role == "guardian"
              return render_error(:forbidden, status: :forbidden)
            end

            guardian = Current.user.guardians.kept.find_by(school_id: Current.school.id)
            return render_error(:not_found, status: :not_found) unless guardian

            Current.guardian = guardian
          end
        end
      end
    end
  end
end
