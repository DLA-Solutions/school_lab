# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # The family's side: they name who may collect each of their children, and withdraw them.
        class AuthorizedPickupsController < BaseController
          include AuthorizedPickupAccess
        end
      end
    end
  end
end
