# frozen_string_literal: true

module Billing
  class CollectionReguaNotifier
    # Stub until collection régua channel discovery completes.
    def self.notify_overdue(charge:)
      Rails.logger.info(
        "[Billing::CollectionReguaNotifier] stub notify for charge=#{charge.id} school=#{charge.school_id}"
      )
      true
    end
  end
end
