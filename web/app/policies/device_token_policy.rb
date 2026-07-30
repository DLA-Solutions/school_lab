# frozen_string_literal: true

class DeviceTokenPolicy < ApplicationPolicy
  def create?
    user.present?
  end
end
