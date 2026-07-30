# frozen_string_literal: true

class ResponseService
  attr_reader :data, :error_code, :details

  def initialize(data: nil, error_code: nil, details: nil)
    @data = data
    @error_code = error_code
    @details = details
  end

  def self.success(data: nil)
    new(data: data)
  end

  def self.failure(code:, details: nil)
    new(error_code: code, details: details)
  end

  def success?
    !has_error?
  end

  def failure?
    has_error?
  end

  private

  def has_error?
    error_code.present?
  end
end
