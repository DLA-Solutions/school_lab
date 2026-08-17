# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        # The school's side of a child's health sheet: read what the family wrote, and write down
        # what a parent said at the counter.
        class StudentHealthRecordsController < Api::V1::Schools::BaseController
          include StudentHealthRecordAccess
        end
      end
    end
  end
end
