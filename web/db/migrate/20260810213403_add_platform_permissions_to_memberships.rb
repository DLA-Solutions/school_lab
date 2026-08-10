# frozen_string_literal: true

class AddPlatformPermissionsToMemberships < ActiveRecord::Migration[8.1]
  def change
    add_column :memberships, :platform_permissions, :jsonb, null: false, default: []
  end
end
