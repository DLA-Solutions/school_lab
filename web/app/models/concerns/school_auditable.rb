# frozen_string_literal: true

# Tenant-scoped change auditing via the audited gem.
# Include on models with `belongs_to :school` — see docs/guidelines/web/auditing.md.
module SchoolAuditable
  extend ActiveSupport::Concern

  AUDITED_EXCEPT = %w[created_at updated_at].freeze

  included do
    audited associated_with: :school, except: AUDITED_EXCEPT
  end
end
