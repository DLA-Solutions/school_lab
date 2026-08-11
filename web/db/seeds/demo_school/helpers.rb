# frozen_string_literal: true

module DemoSchool
  FIRST_NAMES = %w[
    Ana Beatriz Bruno Camila Daniel Eduardo Fernanda Gabriel Helena
    Igor Julia Lucas Mariana Nicolas Olivia Pedro Rafael Sofia Thiago
    Valentina William Yasmin
  ].freeze

  LAST_NAMES = %w[
    Almeida Barbosa Carvalho Dias Esteves Ferreira Gomes Henriques
    Lima Martins Nogueira Oliveira Pereira Queiroz Ribeiro Silva Souza
    Teixeira Uchoa Vieira Xavier
  ].freeze

  STREETS = [
    { street: "Avenida Paulista", neighborhood: "Bela Vista", city: "São Paulo", state: "SP", zip_code: "01310100" },
    { street: "Rua Oscar Freire", neighborhood: "Jardins", city: "São Paulo", state: "SP", zip_code: "01426001" },
    { street: "Rua das Palmeiras", neighborhood: "Moema", city: "São Paulo", state: "SP", zip_code: "04562000" },
    { street: "Alameda Santos", neighborhood: "Cerqueira César", city: "São Paulo", state: "SP", zip_code: "01418000" }
  ].freeze

  module_function

  def seed_enabled?
    Rails.env.local? || ActiveModel::Type::Boolean.new.cast(ENV["SEED_DEMO_DATA"])
  end

  def target_student_count
    ENV.fetch("SEED_STUDENT_COUNT", 75).to_i.clamp(50, 100)
  end

  def generate_cpf(seed)
    base = format("%09d", seed % 1_000_000_000)
    first = Cpf.check_digit(base.chars.map(&:to_i))
    second = Cpf.check_digit("#{base}#{first}".chars.map(&:to_i))
    "#{base}#{first}#{second}"
  end

  def student_cpf(index)
    generate_cpf(500_000 + index)
  end

  def guardian_cpf(index)
    generate_cpf(600_000 + index)
  end

  def teacher_roster_cpf(index)
    generate_cpf(700_000 + index)
  end

  def person_name(index)
    first = FIRST_NAMES[index % FIRST_NAMES.length]
    last = LAST_NAMES[(index / FIRST_NAMES.length) % LAST_NAMES.length]
    "#{first} #{last}"
  end

  def address_for(index)
    STREETS[index % STREETS.length]
  end

  def birth_date_for_grade(grade_level, index)
    year = Date.current.year
    month = ((index % 12) + 1)
    day = ((index % 27) + 1)

    case grade_level
    when /\Ainfantil_(\d)\z/
      Date.new(year - 4 - Regexp.last_match(1).to_i, month, day)
    when /\Afundamental_i_(\d)\z/
      Date.new(year - 6 - Regexp.last_match(1).to_i, month, day)
    when /\Afundamental_ii_(\d)\z/
      Date.new(year - 6 - Regexp.last_match(1).to_i, month, day)
    else
      Date.new(2015, 3, 10)
    end
  end

  def class_definitions_for(student_count)
    # Representative cohorts across segments — counts are scaled to hit the target total.
    base = [
      { grade_level: "infantil_3", name: "A", share: 8 },
      { grade_level: "infantil_4", name: "A", share: 8 },
      { grade_level: "infantil_5", name: "A", share: 8 },
      { grade_level: "fundamental_i_1", name: "A", share: 9 },
      { grade_level: "fundamental_i_2", name: "A", share: 9 },
      { grade_level: "fundamental_i_3", name: "A", share: 9 },
      { grade_level: "fundamental_i_4", name: "A", share: 9 },
      { grade_level: "fundamental_i_5", name: "A", share: 9 },
      { grade_level: "fundamental_ii_6", name: "A", share: 5 },
      { grade_level: "fundamental_ii_7", name: "A", share: 5 },
      { grade_level: "fundamental_ii_8", name: "A", share: 5 },
      { grade_level: "fundamental_ii_9", name: "A", share: 5 }
    ]

    total_share = base.sum { |row| row[:share] }
    allocated = base.map do |row|
      students = (row[:share].to_f / total_share * student_count).round
      row.merge(students: [ students, 1 ].max)
    end

    delta = student_count - allocated.sum { |row| row[:students] }
    allocated[-1][:students] += delta if delta.nonzero?

    allocated
  end
end
