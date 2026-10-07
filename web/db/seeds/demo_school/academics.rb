# frozen_string_literal: true

module DemoSchool
  SUBJECTS_BY_SEGMENT = {
    infantil: %w[Artes Educação\ Infantil Música],
    fundamental_i: %w[Português Matemática Ciências História Geografia],
    fundamental_ii: %w[Português Matemática Ciências História Geografia Inglês]
  }.freeze

  module_function

  def seed_academics!(school, school_classes, logged_in_teacher_user:)
    JobPosition.provision_defaults!(school)
    teaching_post = school.job_positions.kept.find_by!(name: "Professor(a)")

    roster_teachers = seed_teacher_roster!(school, teaching_post)
    logged_in_roster = find_or_create_logged_in_teacher_roster!(
      school: school,
      teaching_post: teaching_post,
      user: logged_in_teacher_user
    )

    subjects = seed_subjects!(school)
    seed_teaching_assignments!(
      school: school,
      school_classes: school_classes,
      roster_teachers: roster_teachers + [ logged_in_roster ],
      subjects: subjects
    )
  end

  def seed_teacher_roster!(school, teaching_post)
    [
      { name: "Carla Nogueira", email: "carla@demo.schoollab.local", cpf_seed: 1 },
      { name: "Roberto Mendes", email: "roberto@demo.schoollab.local", cpf_seed: 2 },
      { name: "Patricia Souza", email: "patricia@demo.schoollab.local", cpf_seed: 3 },
      { name: "Marcos Teixeira", email: "marcos@demo.schoollab.local", cpf_seed: 4 }
    ].map do |attrs|
      teacher = Teacher.find_or_initialize_by(school: school, cpf: teacher_roster_cpf(attrs[:cpf_seed]))
      teacher.assign_attributes(
        name: attrs[:name],
        email: attrs[:email],
        phone: "+55 11 97777-0000",
        job_position: teaching_post,
        hired_on: Date.new(2024, 2, 1)
      )
      teacher.save!
      teacher
    end
  end

  def find_or_create_logged_in_teacher_roster!(school:, teaching_post:, user:)
    teacher = Teacher.find_or_initialize_by(school: school, email: TEACHER_EMAIL)
    teacher.assign_attributes(
      name: "Juliana Costa",
      cpf: teacher.cpf.presence || teacher_roster_cpf(10),
      phone: "+55 11 96666-0000",
      job_position: teaching_post,
      hired_on: Date.new(2023, 8, 1)
    )
    teacher.save!
    teacher
  end

  def seed_subjects!(school)
    SUBJECTS_BY_SEGMENT.values.flatten.uniq.index_with do |subject_name|
      Subject.find_or_create_by!(school: school, name: subject_name)
    end
  end

  def seed_teaching_assignments!(school:, school_classes:, roster_teachers:, subjects:)
    school_classes.each_with_index do |school_class, index|
      teacher = roster_teachers[index % roster_teachers.length]
      subject_names = subjects_for_grade(school_class.grade_level)

      subject_names.each do |subject_name|
        subject = subjects.fetch(subject_name)
        TeachingAssignment.find_or_create_by!(
          school: school,
          teacher: teacher,
          school_class: school_class,
          subject: subject
        )
      end
    end

    assign_logged_in_teacher_to_demo_class!(
      school: school,
      teacher: roster_teachers.find { |row| row.email == TEACHER_EMAIL },
      subjects: subjects
    )
  end

  # Class index 0 stays with Carla. Juliana (the loggable teacher) also teaches Pedro's class
  # so the family destination list includes someone a tester can sign in as.
  def assign_logged_in_teacher_to_demo_class!(school:, teacher:, subjects:)
    return if teacher.blank?

    student = Student.kept.find_by(school: school, cpf: DEMO_STUDENT_CPF)
    school_class = student&.school_class
    return if school_class.blank?

    subjects_for_grade(school_class.grade_level).each do |subject_name|
      assignment = TeachingAssignment.find_or_initialize_by(
        school: school,
        teacher: teacher,
        school_class: school_class,
        subject: subjects.fetch(subject_name)
      )
      assignment.undiscard if assignment.discarded?
      assignment.save!
    end
  end

  def subjects_for_grade(grade_level)
    if grade_level.start_with?("infantil_")
      SUBJECTS_BY_SEGMENT.fetch(:infantil)
    elsif grade_level.start_with?("fundamental_i_")
      SUBJECTS_BY_SEGMENT.fetch(:fundamental_i)
    else
      SUBJECTS_BY_SEGMENT.fetch(:fundamental_ii)
    end
  end
end
