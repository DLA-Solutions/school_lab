# frozen_string_literal: true

module DemoSchool
  SCHOOL_CNPJ = "12.345.678/0001-90"
  ADMIN_EMAIL = "admin@demo.schoollab.local"
  GUARDIAN_EMAIL = "guardian@demo.schoollab.local"
  PASSWORD = "password123"
  DEMO_CHARGE_PERIOD = Date.new(2026, 8, 1)

  module_function

  def seed!
    school_group = SchoolGroup.find_or_create_by!(name: "Demo School Group")

    school = School.find_or_create_by!(cnpj: SCHOOL_CNPJ) do |record|
      record.name = "Escola Demo"
      record.school_group = school_group
    end

    find_or_create_bank_slip_provider!(school)

    admin_user = find_or_create_confirmed_user!(ADMIN_EMAIL)
    find_or_create_membership!(user: admin_user, school: school, role: "school")

    guardian_user = find_or_create_confirmed_user!(GUARDIAN_EMAIL)
    find_or_create_membership!(user: guardian_user, school: school, role: "guardian")

    guardian = Guardian.find_or_create_by!(school: school, email: GUARDIAN_EMAIL) do |record|
      record.name = "Maria Silva"
      record.cpf = "123.456.789-00"
      record.phone = "+55 11 99999-0000"
    end
    guardian.update!(user: guardian_user) if guardian.user_id != guardian_user.id

    student = Student.find_or_create_by!(school: school, name: "Pedro Silva") do |record|
      record.status = "active"
      record.birth_date = Date.new(2015, 3, 10)
    end

    StudentGuardian.find_or_create_by!(school: school, student: student, guardian: guardian) do |record|
      record.financial_percentage = 100
      record.primary_guardian = true
    end

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

  # Issuance requires an active configuration — there is no implicit fake provider. Local
  # development uses the fake adapter, which needs no certificate or client id.
  def find_or_create_bank_slip_provider!(school)
    SchoolPaymentProvider.find_or_create_by!(
      school: school,
      instrument: "bank_slip",
      provider: "fake",
      environment: "stage"
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
  private_class_method :find_or_create_bank_slip_provider!, :find_or_create_confirmed_user!,
                      :find_or_create_membership!
end
