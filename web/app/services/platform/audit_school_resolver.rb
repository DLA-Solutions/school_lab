# frozen_string_literal: true

module Platform
  class AuditSchoolResolver
    def self.call(audit)
      new(audit).call
    end

    def initialize(audit)
      @audit = audit
    end

    def call
      return audit.associated_id if audit.associated_type == "School"
      return audit.auditable_id if audit.auditable_type == "School"

      nil
    end

    private

    attr_reader :audit
  end
end
