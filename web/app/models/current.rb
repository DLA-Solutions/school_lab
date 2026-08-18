# frozen_string_literal: true

class Current < ActiveSupport::CurrentAttributes
  attribute :user, :school, :membership, :guardian, :effective_permission_keys,
            :impersonation_session, :impersonation_operator
end
