# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class StudentHealthProfilesController < Api::V1::Schools::BaseController
          include StudentHealthProfileAccess

          undef :update
        end
      end
    end
  end
end
