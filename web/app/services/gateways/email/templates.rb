# frozen_string_literal: true

module Gateways
  module Email
    # Postmark template aliases — HTML reference in docs/guidelines/web/postmark-templates/.
    module Templates
      LAYOUT = "sp-layout-transactional"
      PASSWORD_RESET = "sp-auth-password-reset"
      MEMBERSHIP_INVITE = "sp-people-membership-invite"
      COLLECTION_REMINDER = "sp-billing-collection-reminder"
      DEMO_REQUEST = "sp-marketing-demo-request"
      DEMO_REQUEST_CONFIRMATION = "sp-marketing-demo-confirmation"

      PASSWORD_RESET_EXPIRY_HOURS = 6
      MEMBERSHIP_INVITE_EXPIRY_DAYS = 7
    end
  end
end
