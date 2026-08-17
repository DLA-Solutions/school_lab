# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # The family's side: a guardian fills in the sheet for each of their children. The base
        # controller resolves the guardian, and `policy_scope(Student)` narrows it to their own.
        class StudentHealthRecordsController < BaseController
          include StudentHealthRecordAccess
        end
      end
    end
  end
end
