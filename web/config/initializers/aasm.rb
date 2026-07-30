# frozen_string_literal: true

# Ensures AASM after_commit callbacks behave correctly outside nested transactions.
# See https://github.com/aasm/aasm#transaction-support
require "after_commit_everywhere"
