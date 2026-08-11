# frozen_string_literal: true

module DemoSchool
  DEMO_STUDENT_NAME = "Pedro Silva"
  DEMO_STUDENT_CPF = "52998224725"

  module_function

  def seed_people!(school)
    school_classes = seed_school_classes!(school)
    students = seed_students!(school, school_classes)
    guardians = seed_guardians!(school, students)
    seed_guardian_users!(school, guardians)

    { school_classes: school_classes, students: students, guardians: guardians }
  end

  def seed_school_classes!(school)
    year = Date.current.year
    class_definitions_for(target_student_count).map do |definition|
      SchoolClass.find_or_create_by!(
        school: school,
        year: year,
        grade_level: definition[:grade_level],
        name: definition[:name]
      )
    end
  end

  def seed_students!(school, school_classes)
    definitions = class_definitions_for(target_student_count)
    student_index = 0
    students = []

    definitions.each_with_index do |definition, class_index|
      school_class = school_classes[class_index]
      definition[:students].times do
        students << find_or_create_student!(
          school: school,
          school_class: school_class,
          index: student_index,
          grade_level: definition[:grade_level]
        )
        student_index += 1
      end
    end

    students
  end

  def find_or_create_student!(school:, school_class:, index:, grade_level:)
    if index.zero?
      return find_or_create_demo_student!(school: school, school_class: school_class)
    end

    cpf = student_cpf(index)
    student = Student.find_or_initialize_by(school: school, cpf: cpf)
    student.assign_attributes(
      name: person_name(index),
      status: "active",
      birth_date: birth_date_for_grade(grade_level, index),
      rg: format("MG-%08d", index + 1),
      school_class: school_class
    )
    student.save!
    student
  end

  def find_or_create_demo_student!(school:, school_class:)
    student = Student.find_or_initialize_by(school: school, cpf: DEMO_STUDENT_CPF)
    student.assign_attributes(
      name: DEMO_STUDENT_NAME,
      status: "active",
      birth_date: Date.new(2015, 3, 10),
      rg: "MG-14.235.789",
      school_class: school_class
    )
    student.save!
    student
  end

  def seed_guardians!(school, students)
    guardians_by_index = {}

    students.each_with_index do |student, student_index|
      mother_index = (student_index * 2) + 1
      father_index = mother_index + 1

      first_name = student.name.split.first
      mother = find_or_create_guardian_record!(
        school: school,
        index: mother_index,
        name_suffix: " (Mãe de #{first_name})"
      )
      father = find_or_create_guardian_record!(
        school: school,
        index: father_index,
        name_suffix: " (Pai de #{first_name})"
      )

      link_guardian_to_student!(
        school: school,
        student: student,
        guardian: mother,
        relationship: "mother",
        financial_percentage: student_index.even? ? 100 : 50,
        primary_guardian: true
      )
      link_guardian_to_student!(
        school: school,
        student: student,
        guardian: father,
        relationship: "father",
        financial_percentage: student_index.even? ? 0 : 50,
        primary_guardian: false
      )

      guardians_by_index[student_index] = { mother: mother, father: father }
    end

    guardians_by_index
  end

  def seed_guardian_users!(school, guardians_by_index)
    LOGGED_IN_GUARDIAN_EMAILS.each_with_index do |email, login_index|
      user = find_or_create_confirmed_user!(email)
      find_or_create_membership!(user: user, school: school, role: "guardian")

      guardian_data = guardians_by_index[login_index]
      next if guardian_data.blank?

      guardian = guardian_data[:mother]
      guardian.assign_attributes(
        name: login_index.zero? ? "Maria Silva" : guardian.name,
        email: email,
        user: user
      )
      guardian.save!
    end
  end

  def find_or_create_guardian_record!(school:, index:, name_suffix: "")
    email = "responsavel#{index}@demo.schoollab.local"
    cpf = guardian_cpf(index)
    address = address_for(index)

    guardian = Guardian.find_or_initialize_by(school: school, cpf: cpf)
    guardian.assign_attributes(
      name: "#{person_name(index + 50)}#{name_suffix}",
      email: email,
      phone: format("+55 11 9%04d-%04d", (index % 10_000), (index % 10_000)),
      zip_code: address[:zip_code],
      street: address[:street],
      number: format("%d", 100 + (index % 900)),
      neighborhood: address[:neighborhood],
      city: address[:city],
      state: address[:state]
    )
    guardian.save!
    guardian
  end

  def link_guardian_to_student!(school:, student:, guardian:, relationship:, financial_percentage:,
                                primary_guardian:)
    link = StudentGuardian.find_or_initialize_by(school: school, student: student, guardian: guardian)
    link.assign_attributes(
      financial_percentage: financial_percentage,
      primary_guardian: primary_guardian,
      relationship: relationship
    )
    link.save!
    link
  end
end
