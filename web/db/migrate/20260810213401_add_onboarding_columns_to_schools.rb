# frozen_string_literal: true

class AddOnboardingColumnsToSchools < ActiveRecord::Migration[8.1]
  def up
    add_column :schools, :onboarding_status, :string, null: false, default: "pending_handoff"
    add_column :schools, :onboarding_mode, :string, null: false, default: "self_serve"
    add_column :schools, :billing_waived_at, :datetime
    add_column :schools, :segments_skipped_at, :datetime

    execute <<~SQL.squish
      UPDATE schools SET onboarding_status = 'active'
    SQL
  end

  def down
    remove_column :schools, :onboarding_status
    remove_column :schools, :onboarding_mode
    remove_column :schools, :billing_waived_at
    remove_column :schools, :segments_skipped_at
  end
end
