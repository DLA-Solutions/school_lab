# frozen_string_literal: true

module DemoSchool
  module_function

  def seed_billing!(school, students, guardians_by_index)
    BillingPurpose.provision_defaults!(school)
    billing_plan = BillingPlan.find_or_create_by!(school: school, name: "Mensalidade 2026") do |record|
      record.plan_type = "tuition"
      record.base_amount_cents = 90_000
    end

    contracts = students.map do |student|
      primary_guardian = primary_guardian_for(student)
      find_or_create_contract!(
        school: school,
        student: student,
        billing_plan: billing_plan,
        payer_guardian: primary_guardian
      )
    end

    seed_current_month_charges!(school, contracts)
    seed_demo_charge!(school, contracts.first, guardians_by_index)
    contracts
  end

  def primary_guardian_for(student)
    link = student.student_guardians.kept.find_by(primary_guardian: true) ||
           student.student_guardians.kept.order(:id).first
    link&.guardian
  end

  def find_or_create_contract!(school:, student:, billing_plan:, payer_guardian:)
    contract = Contract.find_or_create_by!(school: school, student: student, billing_plan: billing_plan) do |record|
      record.negotiated_amount_cents = 85_000
      record.due_day = 10
      record.starts_on = Date.new(Date.current.year, 1, 1)
      record.status = "active"
      record.signature_status = "signed"
    end
    contract.update!(payer_guardian: payer_guardian) if payer_guardian.present?
    contract
  end

  def seed_demo_charge!(school, demo_contract, guardians_by_index)
    demo_guardian = Guardian.find_by(school: school, email: GUARDIAN_EMAIL) ||
                    guardians_by_index.dig(0, :mother)
    return if demo_contract.blank? || demo_guardian.blank?

    tuition_purpose = BillingPurpose.find_or_provision!(school, code: "tuition")
    charge = Charge.find_or_initialize_by(
      school: school,
      contract: demo_contract,
      billing_period: DEMO_CHARGE_PERIOD
    )
    clear_conflicting_demo_invoice!(charge)
    charge.assign_attributes(
      guardian: demo_guardian,
      billing_purpose: tuition_purpose,
      billing_purpose_code: tuition_purpose.code,
      tax_declaration_eligible: tuition_purpose.tax_declaration_eligible,
      original_amount_cents: 90_000,
      discount_amount_cents: 5_000,
      late_fee_amount_cents: 0,
      total_amount_cents: 85_000,
      due_date: Date.new(DEMO_CHARGE_PERIOD.year, DEMO_CHARGE_PERIOD.month, 10),
      provider_invoice_id: "demo-charge-001",
      boleto_url: "https://demo.schoollab.local/boleto/demo-charge-001",
      pix_copy_paste: "00020126580014br.gov.bcb.pixdemo0001"
    )
    charge.save!
    charge.update_columns(status: "pending", paid_at: nil) unless charge.pending?
    charge
  end

  def clear_conflicting_demo_invoice!(charge)
    Charge.where(provider_invoice_id: "demo-charge-001")
          .where.not(id: charge.id)
          .update_all(provider_invoice_id: nil, boleto_url: nil, pix_copy_paste: nil)
  end

  def seed_current_month_charges!(school, contracts)
    billing_period = Date.current.beginning_of_month
    previous_period = billing_period.prev_month
    tuition_purpose = BillingPurpose.find_or_provision!(school, code: "tuition")

    contracts.each_with_index do |contract, index|
      next if contract.student.cpf == DemoSchool::DEMO_STUDENT_CPF

      guardian = contract.payer_guardian || primary_guardian_for(contract.student)
      next if guardian.blank?

      charge = Charge.find_or_create_by!(
        school: school,
        contract: contract,
        guardian: guardian,
        billing_period: billing_period
      ) do |record|
        record.original_amount_cents = 90_000
        record.discount_amount_cents = 5_000
        record.late_fee_amount_cents = 0
        record.total_amount_cents = 85_000
        record.due_date = billing_period.change(day: 10)
        record.billing_purpose = tuition_purpose
        record.billing_purpose_code = tuition_purpose.code
        record.tax_declaration_eligible = tuition_purpose.tax_declaration_eligible
      end

      apply_sample_charge_status!(charge, index)

      previous_charge = Charge.find_or_create_by!(
        school: school,
        contract: contract,
        guardian: guardian,
        billing_period: previous_period
      ) do |record|
        record.original_amount_cents = 90_000
        record.discount_amount_cents = 5_000
        record.late_fee_amount_cents = 0
        record.total_amount_cents = 85_000
        record.due_date = previous_period.change(day: 10)
        record.billing_purpose = tuition_purpose
        record.billing_purpose_code = tuition_purpose.code
        record.tax_declaration_eligible = tuition_purpose.tax_declaration_eligible
      end

      apply_previous_charge_status!(previous_charge, index)
    end
  end

  def apply_sample_charge_status!(charge, index)
    return if charge.paid? || charge.cancelled?

    case index % 10
    when 0
      charge.pay! if charge.may_pay?
    when 1
      charge.mark_overdue! if charge.may_mark_overdue?
    end
  end

  def apply_previous_charge_status!(charge, index)
    return if charge.paid? || charge.cancelled?

    if index.even?
      charge.pay! if charge.may_pay?
    elsif index % 5 == 1
      charge.mark_overdue! if charge.may_mark_overdue?
    end
  end
end
