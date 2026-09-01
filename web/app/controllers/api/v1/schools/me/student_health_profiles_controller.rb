# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class StudentHealthProfilesController < BaseController
          include StudentHealthProfileAccess
        end
      end
    end
  end
end
