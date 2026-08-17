# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        # The school's side: staff at the gate read who may collect the child.
        class AuthorizedPickupsController < Api::V1::Schools::BaseController
          include AuthorizedPickupAccess
        end
      end
    end
  end
end
