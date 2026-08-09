# frozen_string_literal: true

# Canonical form and validity of a Brazilian CPF.
#
# The stored form is the 11 digits alone: it is what the per-school unique index compares, so any
# two spellings of the same document must collapse to the same string before they reach the
# database.
module Cpf
  LENGTH = 11

  module_function

  # "123.456.789-09" => "12345678909". Returns nil for a blank input so a missing CPF stays NULL
  # rather than becoming "".
  def normalize(value)
    return if value.blank?

    digits = value.to_s.gsub(/\D/, "")
    digits.presence
  end

  # "12345678909" => "123.456.789-09". Anything not 11 digits is handed back untouched.
  def format(value)
    digits = normalize(value)
    return value unless digits&.length == LENGTH

    "#{digits[0, 3]}.#{digits[3, 3]}.#{digits[6, 3]}-#{digits[9, 2]}"
  end

  # A CPF carries two check digits derived from the first nine, which is what separates a real
  # document from any 11-digit string. Repdigits (000.000.000-00, 111.111.111-11, ...) satisfy the
  # arithmetic by accident and are rejected explicitly.
  def valid?(value)
    digits = normalize(value)
    return false unless digits&.length == LENGTH
    return false if digits.chars.uniq.size == 1

    numbers = digits.chars.map(&:to_i)

    numbers[9] == check_digit(numbers.first(9)) &&
      numbers[10] == check_digit(numbers.first(10))
  end

  # Each check digit is a weighted sum of the digits before it, taken modulo 11.
  def check_digit(numbers)
    weight = numbers.length + 1
    sum = numbers.each_with_index.sum { |number, index| number * (weight - index) }
    remainder = (sum * 10) % 11

    remainder == 10 ? 0 : remainder
  end
end
