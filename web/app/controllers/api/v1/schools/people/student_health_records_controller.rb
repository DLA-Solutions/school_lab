# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class StudentHealthRecordsController < Api::V1::Schools::BaseController
          include StudentHealthRecordAccess

          undef :create, :update, :destroy
        end
      end
    end
  end
end
