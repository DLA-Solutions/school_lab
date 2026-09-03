# frozen_string_literal: true

module Notifications
  class NotifyContractSignedJob < ApplicationJob
    queue_as :default

    discard_on ActiveRecord::RecordNotFound

    def perform(contract_id, school_id)
      school = School.kept.find(school_id)
      contract = school.contracts.kept.find(contract_id)

      Notifications::NotifyContractSignedService.call(contract: contract)
    end
  end
end
