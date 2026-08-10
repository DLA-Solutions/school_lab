# frozen_string_literal: true

# Role templates: Identity::ProvisionSystemRoleTemplatesService (permissions PRD UC-P04b).
# Legacy membership backfill: rake permissions:migrate_memberships (UC-P04).

module DemoSchool
  SCHOOL_CNPJ = "12.345.678/0001-90"
  ADMIN_EMAIL = "admin@demo.schoollab.local"
  GUARDIAN_EMAIL = "guardian@demo.schoollab.local"
  PASSWORD = "password123"
  DEMO_CHARGE_PERIOD = Date.new(2026, 8, 1)

  module_function

  def seed!
    school_group = SchoolGroup.find_or_create_by!(name: ENV.fetch("SEED_SCHOOL_GROUP_NAME", "School Lab Group"))

    school = School.find_or_create_by!(cnpj: SCHOOL_CNPJ) do |record|
      # Named from the environment so a real deployment seeds under its own name instead of
      # carrying "Escola Demo" into every screen that shows the current school.
      record.name = ENV.fetch("SEED_SCHOOL_NAME", "School Lab")
      record.school_group = school_group
      record.onboarding_mode = "self_serve"
      record.onboarding_status = "active"
    end
    school.update!(
      onboarding_mode: "self_serve",
      onboarding_status: "active"
    )

    ensure_system_role_templates!(school)

    find_or_create_bank_slip_provider!(school)
    find_or_create_billing_settings!(school)

    admin_user = find_or_create_confirmed_user!(ADMIN_EMAIL)
    admin_membership = find_or_create_membership!(user: admin_user, school: school, role: "staff")
    ensure_owner_staff_profile!(membership: admin_membership, school: school)

    guardian_user = find_or_create_confirmed_user!(GUARDIAN_EMAIL)
    find_or_create_membership!(user: guardian_user, school: school, role: "guardian")

    guardian = Guardian.find_or_initialize_by(school: school, email: GUARDIAN_EMAIL)
    # Assigned on every run, not only on create: a demo database seeded before CPF was validated
    # holds "12345678900", whose check digits never matched, and the record would stay invalid.
    guardian.assign_attributes(
      name: "Maria Silva",
      cpf: "123.456.789-09",
      phone: "+55 11 99999-0000",
      zip_code: "01310100",
      street: "Avenida Paulista",
      number: "1000",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      user: guardian_user
    )
    guardian.save!

    school_class = SchoolClass.find_or_create_by!(
      school: school, year: Date.current.year, grade_level: "fundamental_i_5", name: "A"
    )

    student = Student.find_or_initialize_by(school: school, name: "Pedro Silva")
    # Assigned every run: enrolment details became required after this seed first shipped.
    student.assign_attributes(
      status: "active",
      birth_date: Date.new(2015, 3, 10),
      cpf: "529.982.247-25",
      rg: "MG-14.235.789",
      school_class: school_class
    )
    student.save!

    link = StudentGuardian.find_or_initialize_by(school: school, student: student, guardian: guardian)
    link.assign_attributes(financial_percentage: 100, primary_guardian: true, relationship: "mother")
    link.save!

    seed_academics!(school, school_class)

    billing_plan = BillingPlan.find_or_create_by!(school: school, name: "Mensalidade Demo") do |record|
      record.plan_type = "tuition"
      record.base_amount_cents = 90_000
    end

    contract = Contract.find_or_create_by!(school: school, student: student, billing_plan: billing_plan) do |record|
      record.negotiated_amount_cents = 85_000
      record.due_day = 10
      record.starts_on = Date.new(2026, 1, 1)
      record.status = "active"
    end

    Charge.find_or_create_by!(school: school, contract: contract, guardian: guardian, billing_period: DEMO_CHARGE_PERIOD) do |record|
      record.original_amount_cents = 90_000
      record.discount_amount_cents = 5_000
      record.late_fee_amount_cents = 0
      record.total_amount_cents = 85_000
      record.due_date = Date.new(2026, 8, 10)
      record.provider_invoice_id = "demo-charge-001"
      record.boleto_url = "https://demo.schoollab.local/boleto/demo-charge-001"
      record.pix_copy_paste = "00020126580014br.gov.bcb.pixdemo0001"
    end
  end

  # A teacher covering two subjects of the demo cohort, so the teacher listing has something to
  # show on a fresh database.
  def seed_academics!(school, school_class)
    # Every school starts with the standard set of posts; the demo teacher holds one of them.
    JobPosition.provision_defaults!(school)
    teaching_post = school.job_positions.kept.find_by(name: "Professor(a)")

    teacher = Teacher.find_or_initialize_by(school: school, cpf: "15852119075")
    teacher.assign_attributes(
      name: "Carla Nogueira", email: "carla@demo.schoollab.local", phone: "+55 11 97777-0000",
      job_position: teaching_post, hired_on: Date.new(2024, 2, 1)
    )
    teacher.save!

    [ "Matemática", "Ciências" ].each do |subject_name|
      subject = Subject.find_or_create_by!(school: school, name: subject_name)
      TeachingAssignment.find_or_create_by!(
        school: school, teacher: teacher, school_class: school_class, subject: subject
      )
    end
  end

  # Issuance requires an active configuration — there is no implicit fake provider. Local
  # development uses the fake adapter, which needs no certificate or client id.
  def find_or_create_billing_settings!(school)
    settings = SchoolBillingSettings.find_or_initialize_by(school: school)
    settings.overdue_grace_days ||= 3
    settings.interest_rate_percent ||= 1.0
    settings.save!
  end

  def find_or_create_bank_slip_provider!(school)
    SchoolPaymentProvider.find_or_create_by!(
      school: school,
      instrument: "bank_slip",
      provider: "fake"
    ) do |record|
      record.active = true
    end
  end

  def find_or_create_confirmed_user!(email)
    user = User.find_or_initialize_by(email: email)
    return user if user.persisted?

    user.password = PASSWORD
    user.password_confirmation = PASSWORD
    user.status = "active"
    user.confirmed_at = Time.current
    user.save!
    user
  end

  def find_or_create_membership!(user:, school:, role:)
    Membership.find_or_create_by!(user: user, school: school, role: role) do |record|
      record.status = "active"
    end
  end

  def ensure_system_role_templates!(school)
    result = Identity::ProvisionSystemRoleTemplatesService.call(school: school)
    return result.data.fetch(:templates) if result.success?

    raise "Demo seed failed to provision role templates: #{result.error_code} #{result.details}"
  end

  def ensure_owner_staff_profile!(membership:, school:)
    director_template = school.system_role_template("director")
    raise "Demo seed missing director role template" if director_template.blank?

    profile = StaffProfile.find_or_initialize_by(membership: membership, school: school)
    profile.assign_attributes(
      role_template: director_template,
      is_owner: true,
      display_title: profile.display_title.presence || "Diretor"
    )
    profile.save!
    profile
  end

  private_class_method :find_or_create_bank_slip_provider!, :find_or_create_billing_settings!,
                      :find_or_create_confirmed_user!, :find_or_create_membership!
end
