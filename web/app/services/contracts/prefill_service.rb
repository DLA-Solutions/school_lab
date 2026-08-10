# frozen_string_literal: true

module Contracts
  # Everything a contract for one student is built from, gathered in a single read so the screen
  # can fill itself in rather than making the operator re-type what the register already holds.
  #
  # It also says what would stop the send. Autentique identifies a signer by e-mail and demands a
  # CPF from whoever opens the link, so a guardian missing either cannot sign — and finding that
  # out from a rejected upload, with a family already expecting the contract, is late. The same
  # checks `SendForSignatureService` applies are reported here, before anything is created.
  class PrefillService < ApplicationService
    # The school's usual due date, and what the form has always started on.
    DEFAULT_DUE_DAY = 5

    def initialize(school:, student:)
      @school = school
      @student = student
    end

    def call
      ResponseService.success(
        data: {
          student: student_details,
          guardians: guardian_details,
          suggested: suggestions,
          # Empty means the contract can go out as it stands.
          blocking_issues: blocking_issues,
          warnings: warnings
        }
      )
    end

    private

    attr_reader :school, :student

    def links
      @links ||= student.student_guardians.kept.includes(:guardian).to_a
    end

    def guardians
      @guardians ||= links.map(&:guardian)
    end

    def student_details
      {
        id: student.id,
        name: student.name,
        cpf: student.cpf,
        rg: student.rg,
        birth_date: student.birth_date,
        school_class_name: student.school_class&.name,
        grade_level: student.school_class&.grade_level,
        year: student.school_class&.year
      }
    end

    # Everyone who will be asked to sign, with what each is missing named against them — so the
    # school knows which record to complete rather than which field in the abstract.
    def guardian_details
      links.map do |link|
        guardian = link.guardian
        missing = missing_signer_fields(guardian)

        {
          id: guardian.id,
          name: guardian.name,
          cpf: guardian.cpf,
          email: guardian.email,
          phone: guardian.phone,
          relationship: link.relationship,
          primary_guardian: link.primary_guardian == true,
          can_sign: missing.empty?,
          missing: missing
        }
      end
    end

    def missing_signer_fields(guardian)
      fields = []
      fields << "email" if guardian.email.blank?
      fields << "cpf" if guardian.cpf.blank?
      fields
    end

    def suggestions
      plan = only_plan

      {
        payer_guardian_id: suggested_payer&.id,
        billing_plan_id: plan&.id,
        plan_discount_id: nil,
        negotiated_amount_cents: plan&.base_amount_cents,
        due_day: DEFAULT_DUE_DAY,
        starts_on: Date.current
      }
    end

    # Whoever the family named as the primary; failing that, the first one on file — the same
    # order `Contract#payer` falls back through, so the suggestion matches what would happen
    # anyway if the field were left alone.
    def suggested_payer
      primary = links.find { |link| link.primary_guardian == true }

      (primary || links.first)&.guardian
    end

    # A school with one plan has nothing to choose; one with several does, and guessing on its
    # behalf would put a family on the wrong tuition.
    def only_plan
      plans = school.billing_plans.kept.to_a

      plans.one? ? plans.first : nil
    end

    def blocking_issues
      issues = []
      issues << I18n.t("api.errors.contract_without_guardians") if guardians.empty?

      incomplete = guardian_details.reject { |row| row[:can_sign] }
      if incomplete.any?
        issues << I18n.t("api.errors.signer_missing_details",
                         names: incomplete.pluck(:name).to_sentence)
      end

      issues
    end

    # Not enough to stop a send, but the contract goes out with a gap in it: the agreement names
    # the student's documents, and a blank there is a document nobody can complete later.
    def warnings
      warnings = []
      warnings << I18n.t("api.warnings.student_without_cpf") if student.cpf.blank?
      warnings << I18n.t("api.warnings.student_without_class") if student.school_class.blank?
      # Not blocking: the send falls back to the built-in agreement. Worth saying, because that
      # one carries none of the school's own clauses.
      warnings << I18n.t("api.warnings.contract_template_missing") if school.contract_template.blank?
      warnings
    end
  end
end
