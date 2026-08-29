# frozen_string_literal: true

module Contracts
  class ProvisionGuardianAccessJob < ApplicationJob
    queue_as :default

    discard_on ActiveRecord::RecordNotFound

    def perform(contract_id, school_id)
      school = School.kept.find(school_id)
      contract = school.contracts.kept.find(contract_id)

      result = Contracts::ProvisionGuardianAccessService.call(contract: contract)
      log_failure(contract, result) if result.failure?
    end

    private

    def log_failure(contract, result)
      Rails.logger.warn(
        {
          event: "contract.guardian_access_failed",
          contract_id: contract.id,
          school_id: contract.school_id,
          error_code: result.error_code
        }.to_json
      )
    end
  end
end
