# frozen_string_literal: true

# Canonical form and validity of a Brazilian CNPJ.
#
# The school signs its contracts as a legal entity, so the document the provider is told to demand
# from whoever opens the link is a CNPJ rather than a CPF. Mirrors `Cpf`: the bare digits are the
# canonical form, and the formatting is only for display.
module Cnpj
  LENGTH = 14

  # The weights each half of the check-digit calculation runs through, from the right.
  FIRST_WEIGHTS = [ 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 ].freeze
  SECOND_WEIGHTS = [ 6, *FIRST_WEIGHTS ].freeze

  module_function

  # "66.154.330/0001-40" => "66154330000140". Returns nil for a blank input, so a missing document
  # stays NULL rather than becoming "".
  def normalize(value)
    return if value.blank?

    value.to_s.gsub(/\D/, "").presence
  end

  # "66154330000140" => "66.154.330/0001-40". Anything not 14 digits is handed back untouched.
  def format(value)
    digits = normalize(value)
    return value unless digits&.length == LENGTH

    "#{digits[0, 2]}.#{digits[2, 3]}.#{digits[5, 3]}/#{digits[8, 4]}-#{digits[12, 2]}"
  end

  # Two check digits derived from the twelve before them, which is what separates a real document
  # from any 14-digit string. Repdigits satisfy the arithmetic by accident and are refused outright.
  def valid?(value)
    digits = normalize(value)
    return false unless digits&.length == LENGTH
    return false if digits.chars.uniq.size == 1

    numbers = digits.chars.map(&:to_i)

    numbers[12] == check_digit(numbers.first(12), FIRST_WEIGHTS) &&
      numbers[13] == check_digit(numbers.first(13), SECOND_WEIGHTS)
  end

  def check_digit(numbers, weights)
    remainder = numbers.zip(weights).sum { |number, weight| number * weight } % 11

    remainder < 2 ? 0 : 11 - remainder
  end
end
