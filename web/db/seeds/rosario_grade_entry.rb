# frozen_string_literal: true

# Extends the local "Colégio Nossa Senhora do Rosário" dev fixture so
# teacher@demo.schoollab.local can exercise "Lançamento de Notas" (grade entry)
# end-to-end for Fundamental I (1º ao 5º ano) only.
#
# That school, its teacher user/membership, and most of its academic data (other
# grade levels, other teachers' class_disciplines) are NOT provisioned by
# `DemoSchool` (demo_school.rb seeds a different tenant — "Colégio Demo School
# Lab", a different CNPJ) — this is a separate, already-populated local dev
# fixture. This seed only *extends* it for the Fundamental I + grade-entry
# scenario: it never recreates the school/teacher/membership, and reuses any
# turma, subject, enrollment, or grading data already present.
#
# The school year uses **bimestre** (4 periods), matching this product's
# grading model — never trimestre. If the fixture's school year was built with
# the "trimester" template (3 periods), `ensure_bimester_periods!` discards
# those periods (soft-delete, via Discard — see its own comment for why) and
# rebuilds 4 "bimestre" periods via the general-purpose
# `SchoolYears::PeriodTemplateBuilder`, the same service `CreateSchoolYearService`
# uses for every school. That builder itself is untouched here and still
# supports "trimester" for any other school that deliberately uses it.
#
# Idempotent — safe to run repeatedly via `bin/rails db:seed`. No-ops cleanly
# (with a warning) if the fixture school or teacher do not exist yet, since
# this seed only extends an existing tenant rather than bootstrapping one.
module RosarioGradeEntry
  SCHOOL_CNPJ = "66.154.330/0001-40"
  TEACHER_EMAIL = "teacher@demo.schoollab.local"
  FUNDAMENTAL_I_GRADE_LEVELS = %w[fundamental_i_1 fundamental_i_2 fundamental_i_3 fundamental_i_4 fundamental_i_5].freeze
  TEACHER_SUBJECT_NAMES = %w[Português Matemática Ciências].freeze
  OTHER_FUNDAMENTAL_I_SUBJECT_NAMES = %w[História Geografia].freeze
  GRADE_SCALE_NAME = "Numérica 0-10"
  TARGET_STUDENTS_PER_CLASS = 10
  TEACHING_POST_NAME = "Professor(a)"
  PERIOD_TEMPLATE = "bimester"

  module_function

  def seed!
    school = School.kept.find_by(cnpj: SCHOOL_CNPJ)
    unless school
      warn "[RosarioGradeEntry] Skipped: no school with CNPJ #{SCHOOL_CNPJ} — this seed only extends an existing fixture."
      return nil
    end

    teacher_user = User.kept.find_by(email: TEACHER_EMAIL)
    unless teacher_user
      warn "[RosarioGradeEntry] Skipped: no user #{TEACHER_EMAIL} — this seed only extends an existing fixture."
      return nil
    end

    teacher = find_or_create_teacher!(school)
    find_or_create_teacher_membership!(school: school, user: teacher_user)

    school_classes = find_or_create_fundamental_i_classes!(school)
    subjects = find_or_create_subjects!(school)
    ensure_enrollment!(school, school_classes)

    class_disciplines = assign_teacher_to_class_disciplines!(
      school: school, teacher: teacher, school_classes: school_classes, subjects: subjects
    )

    school_year = school_year_for(school)
    periods = ensure_bimester_periods!(school_year)

    if periods.present?
      ensure_evaluation_templates!(school: school, class_disciplines: class_disciplines, periods: periods)
    else
      warn "[RosarioGradeEntry] School year #{school_year.id} has no periods — skipping evaluation templates."
    end

    { school: school, teacher: teacher, class_disciplines: class_disciplines, periods: periods }
  end

  def find_or_create_teacher!(school)
    teacher = Teacher.kept.find_by(school: school, email: TEACHER_EMAIL)
    return teacher if teacher

    JobPosition.provision_defaults!(school)
    teaching_post = school.job_positions.kept.find_by!(name: TEACHING_POST_NAME)

    Teacher.create!(
      school: school,
      name: "Professor Demo (login #{TEACHER_EMAIL})",
      cpf: "12345678909",
      email: TEACHER_EMAIL,
      phone: "+55 11 90000-0000",
      job_position: teaching_post,
      hired_on: Date.new(2024, 2, 1)
    )
  end

  def find_or_create_teacher_membership!(school:, user:)
    membership = Membership.find_or_initialize_by(user: user, school: school)
    membership.assign_attributes(role: "teacher", status: "active") if membership.new_record?
    membership.save! if membership.new_record? || membership.changed?
    membership
  end

  def find_or_create_fundamental_i_classes!(school)
    year = Date.current.year

    FUNDAMENTAL_I_GRADE_LEVELS.map do |grade_level|
      SchoolClass.find_or_create_by!(school: school, year: year, grade_level: grade_level, name: "A")
    end
  end

  def find_or_create_subjects!(school)
    (TEACHER_SUBJECT_NAMES + OTHER_FUNDAMENTAL_I_SUBJECT_NAMES).uniq.index_with do |subject_name|
      Subject.find_or_create_by!(school: school, name: subject_name)
    end
  end

  def ensure_enrollment!(school, school_classes)
    school_classes.each do |school_class|
      existing = school_class.students.kept.count
      next if existing >= TARGET_STUDENTS_PER_CLASS

      (existing...TARGET_STUDENTS_PER_CLASS).each do |slot|
        seed_index = 900_000 + (school_class.id * 100) + slot
        cpf = DemoSchool.generate_cpf(seed_index)
        birth_year = Date.current.year - 6 - school_class.grade_level[/\d+\z/].to_i

        student = Student.find_or_initialize_by(school: school, cpf: cpf)
        next if student.persisted?

        student.assign_attributes(
          name: DemoSchool.person_name(seed_index),
          status: "active",
          birth_date: Date.new(birth_year, ((slot % 12) + 1), ((slot % 27) + 1)),
          school_class: school_class
        )
        student.save!
      end
    end
  end

  def assign_teacher_to_class_disciplines!(school:, teacher:, school_classes:, subjects:)
    school_year = school_year_for(school)

    school_classes.each_with_object([]) do |school_class, acc|
      TEACHER_SUBJECT_NAMES.each do |subject_name|
        subject = subjects.fetch(subject_name)

        class_discipline = ClassDiscipline.find_or_initialize_by(school_class: school_class, subject: subject)
        class_discipline.school = school
        class_discipline.school_year = school_year if class_discipline.school_year.blank?
        class_discipline.teacher = teacher
        class_discipline.required_on_report_card = true if class_discipline.required_on_report_card.nil?
        class_discipline.save!

        acc << class_discipline
      end
    end
  end

  def school_year_for(school)
    SchoolYear.kept.for_calendar_year(Date.current.year).find_by(school: school) ||
      SchoolYear.kept.where(school: school).order(ends_on: :desc).first!
  end

  # Makes sure `school_year` has exactly the 4 "bimestre" periods this product's grading model
  # expects. No-ops if it already does (idempotent re-run). Otherwise — e.g. a school year built
  # with the "trimester" template, like this fixture's originally was — discards (soft-delete) the
  # existing periods and rebuilds with `SchoolYears::PeriodTemplateBuilder`, the same general
  # service `CreateSchoolYearService` uses for every school's period template.
  #
  # Discard rather than destroy: `AcademicPeriod#destroy` cascades (`dependent: :destroy`) through
  # evaluation_templates/components, grade_entries, grade_launches, grade_overrides and
  # attendance_sessions, but some periods here already have `ReportCardPublication` rows pointing
  # at them with no cascading FK (`on_delete` unset) — a hard destroy would raise
  # `ActiveRecord::InvalidForeignKey`. Discarding sidesteps that: every read path in the app scopes
  # through `AcademicPeriod.kept` (see `AcademicPeriodPolicy::Scope`, `GradeBooksController`), so a
  # discarded period and anything still pointing at it simply stop appearing — without deleting
  # rows a FK still references.
  #
  # This is local dev-only data for one fixture school — acceptable to leave those old
  # evaluation_templates/components/grade_entries orphaned-by-invisibility (unreachable, but not
  # deleted) rather than engineer a fully general cross-table reconciliation for a throwaway
  # fixture. Nothing here touches `PeriodTemplateBuilder` itself or any other school's data.
  def ensure_bimester_periods!(school_year)
    bimester_count = SchoolYears::PeriodTemplateBuilder::TEMPLATE_COUNTS.fetch(PERIOD_TEMPLATE)
    existing = school_year.academic_periods.kept.order(:sequence).to_a

    return existing if school_year.period_template == PERIOD_TEMPLATE && existing.size == bimester_count

    if existing.any?
      entry_count = GradeEntry.kept.where(academic_period: existing).count
      warn "[RosarioGradeEntry] School year #{school_year.id} has #{existing.size} " \
           "#{school_year.period_template} period(s) — discarding them and rebuilding #{bimester_count} " \
           "bimestre periods. #{entry_count} existing grade entr#{entry_count == 1 ? 'y becomes' : 'ies become'} " \
           "unreachable (local dev fixture; acceptable)."
      existing.each(&:discard!)
    end

    school_year.update!(period_template: PERIOD_TEMPLATE)

    SchoolYears::PeriodTemplateBuilder.build(school_year: school_year, template: PERIOD_TEMPLATE).map do |attrs|
      school_year.academic_periods.create!(attrs.merge(school: school_year.school))
    end
  end

  def ensure_evaluation_templates!(school:, class_disciplines:, periods:)
    grade_scale = find_or_create_grade_scale!(school)
    admin_membership = school.memberships.kept.find_by(role: "school") || school.memberships.kept.first!

    periods.each do |period|
      class_disciplines.group_by(&:school_class).each do |school_class, disciplines|
        template = EvaluationTemplate.current.find_by(school_class: school_class, academic_period: period)
        template ||= EvaluationTemplate.create!(
          school_class: school_class,
          academic_period: period,
          version: 1,
          rounding_mode: "half_up",
          lock_on_launch: false,
          created_by_membership: admin_membership
        )

        disciplines.each do |class_discipline|
          ensure_evaluation_components!(
            template: template, class_discipline: class_discipline, grade_scale: grade_scale, sequence: period.sequence
          )
        end
      end
    end
  end

  def find_or_create_grade_scale!(school)
    GradeScale.kept.find_by(school: school, name: GRADE_SCALE_NAME) ||
      GradeScale.create!(
        school: school,
        name: GRADE_SCALE_NAME,
        scale_type: "numeric",
        version: 1,
        configuration: { "min" => 0, "max" => 10, "decimals" => 1 }
      )
  end

  # Two exam grades (N1, N2) that repeat with the same name every bimestre, plus one work grade
  # whose number tracks the period's own sequence (T1..T4) so all 4 bimestres can coexist without
  # colliding names.
  def ensure_evaluation_components!(template:, class_discipline:, grade_scale:, sequence:)
    return if class_discipline.evaluation_components.kept.where(evaluation_template: template).exists?

    [
      { name: "N1", position: 1, weight_percent: 40.0 },
      { name: "N2", position: 2, weight_percent: 40.0 },
      { name: "T#{sequence}", position: 3, weight_percent: 20.0 }
    ].each do |attrs|
      EvaluationComponent.create!(
        evaluation_template: template,
        class_discipline: class_discipline,
        grade_scale: grade_scale,
        entry_kind: "regular",
        **attrs
      )
    end
  end

  private_class_method :find_or_create_teacher!, :find_or_create_teacher_membership!,
                        :find_or_create_fundamental_i_classes!, :find_or_create_subjects!,
                        :ensure_enrollment!, :assign_teacher_to_class_disciplines!,
                        :school_year_for, :ensure_bimester_periods!, :ensure_evaluation_templates!,
                        :find_or_create_grade_scale!, :ensure_evaluation_components!
end
