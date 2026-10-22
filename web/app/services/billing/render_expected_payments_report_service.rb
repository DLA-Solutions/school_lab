# frozen_string_literal: true

module Billing
  # What each class is expected to bring in per month, child by child: the student, who answers
  # for them, and the amount their contract says the family pays. One class per page, each closed
  # with a subtotal, and the whole report with a grand total.
  #
  # The amount is what the contract AGREES the family pays — after a scholarship or discount band,
  # or at the negotiated figure (`Billing::ContractTuitionAmounts`, the rule the dashboard totals
  # with over `Contract.active`) — so a class subtotal can be added up against the number on the
  # front page. A child with several active contracts is the sum of them, exactly as the
  # dashboard counts them.
  #
  # A child with no active contract is still listed — as "not contracted" and worth nothing to the
  # total — because the gap is what a school reading this wants to see. A child with no class goes
  # last, under "Sem turma".
  #
  # Guardians are named, never identified: no CPF is printed. The guardian who pays (the
  # contract's payer, as `Contract#payer` resolves it) is marked.
  class RenderExpectedPaymentsReportService < People::RegisterReportService
    COLUMNS = {
      "student" => { header: "Estudante" },
      "guardians" => { header: "Responsáveis" },
      "plan" => { header: "Plano" },
      "signature_status" => { header: "Assinatura" },
      "expected_amount" => { header: "Valor previsto (mensal)" }
    }.freeze

    DEFAULT_COLUMNS = %w[student guardians expected_amount].freeze

    # `all` is every enrolment state; the others are the student's own `status`. A discarded
    # student is never reported, whatever is asked.
    STATUSES = (Student::STATUSES + %w[all]).freeze

    def initialize(school:, contracts:, columns: nil, school_class: nil, status: "active")
      @contracts = contracts
      @school_class = school_class
      @status = status.presence || "active"
      super(school: school, columns: columns)
    end

    private

    attr_reader :contracts, :school_class, :status

    def available_columns = COLUMNS
    def default_columns = DEFAULT_COLUMNS
    def report_title = I18n.t("reports.expected_payments.title")
    def slug = "valores-previstos"

    def grouped_rows
      grouped_entries.transform_values { |entries| entries.map { |entry| row_for(entry) } }
    end

    # `{ school_class_or_nil => [entry, ...] }`, children alphabetical within the class.
    def grouped_entries
      @grouped_entries ||= entries.group_by(&:school_class)
                                  .transform_values { |list| list.sort_by(&:sort_key) }
    end

    Entry = Struct.new(:student, :school_class, :cents, :contracted, :guardians, :payer_ids,
                       :plans, :signature_statuses) do
      def sort_key = [ I18n.transliterate(student.name.to_s).downcase, student.id ]
    end

    def entries
      @entries ||= students.map { |student| entry_for(student) }
    end

    def students
      @students ||= load_students
    end

    def load_students
      scope = school.students.kept
      scope = scope.where(school_class_id: school_class.id) if school_class
      scope = scope.where(status: status) unless status == "all"

      scope.includes(:school_class, student_guardians: :guardian).to_a
    end

    def entry_for(student)
      rows = contract_rows[student.id] || []
      guardians = kept_guardians(student)

      Entry.new(
        student, cohort_of(student), rows.sum { |row| row.expected_cents.to_i }, rows.any?,
        guardians, payer_ids(rows, guardians),
        rows.filter_map(&:plan_name).uniq, rows.map(&:signature_status).uniq
      )
    end

    # A class that has since been discarded is no longer a place a child can be looked for, so the
    # child is listed with those who have none — the same call the dashboard makes.
    def cohort_of(student)
      student.school_class if student.school_class&.kept?
    end

    # The link and the person must both still be on file.
    def kept_guardians(student)
      student.student_guardians.select(&:kept?).map(&:guardian).select(&:kept?)
    end

    # Mirrors `Contract#payer`: the guardian named on the contract, else the first of the child's
    # guardians. Done over already-loaded rows so a long roll is not one query per child.
    def payer_ids(rows, guardians)
      rows.filter_map { |row| row.payer_guardian_id || guardians.first&.id }.uniq
    end

    Row = Struct.new(:student_id, :payer_guardian_id, :signature_status, :expected_cents, :plan_name)

    # Active contracts of the children being reported, each with the amount it agrees to, resolved
    # by the shared rule rather than restated here. Plan and discount are preloaded so a long roll
    # is not a query per contract.
    def contract_rows
      @contract_rows ||= begin
        ids = students.map(&:id)

        contracts.active
                 .where(school_id: school.id, student_id: ids)
                 .includes(:billing_plan, :plan_discount)
                 .order(:id)
                 .map { |contract| row_for_contract(contract) }
                 .group_by(&:student_id)
      end
    end

    def row_for_contract(contract)
      Row.new(contract.student_id, contract.payer_guardian_id, contract.signature_status,
              ContractTuitionAmounts.for(contract).total_amount_cents, contract.billing_plan&.name)
    end

    def row_for(entry)
      columns.map do |column|
        case column
        when "student" then entry.student.name.to_s
        when "guardians" then guardians_cell(entry)
        when "plan" then entry.plans.join(", ")
        when "signature_status" then signature_cell(entry)
        when "expected_amount" then amount_cell(entry)
        end
      end
    end

    def guardians_cell(entry)
      entry.guardians.sort_by { |guardian| guardian.name.to_s }.map do |guardian|
        next guardian.name.to_s unless entry.payer_ids.include?(guardian.id)

        "#{guardian.name} #{I18n.t('reports.expected_payments.payer_mark')}"
      end.join(", ")
    end

    def signature_cell(entry)
      entry.signature_statuses.map do |value|
        I18n.t("reports.expected_payments.signature_status.#{value}", default: value.to_s)
      end.join(", ")
    end

    def amount_cell(entry)
      return I18n.t("reports.expected_payments.not_contracted") unless entry.contracted

      money(entry.cents)
    end

    # Brazilian currency whatever the interface language: the report is a document for a
    # Brazilian school, and its figures are reais.
    def money(cents)
      ActiveSupport::NumberHelper.number_to_currency(
        BigDecimal(cents.to_i) / 100, I18n.t("reports.currency").symbolize_keys
      )
    end

    def amount_index
      @amount_index ||= columns.index("expected_amount")
    end

    def table_rows(cohort, rows)
      return rows unless amount_index

      rows + [ subtotal_row(grouped_entries.fetch(cohort).sum(&:cents)) ]
    end

    def subtotal_row(cents)
      label = I18n.t("reports.expected_payments.subtotal")
      cells = Array.new(columns.size, "")

      if amount_index.zero?
        cells[0] = "#{label}: #{money(cents)}"
      else
        cells[0] = label
        cells[amount_index] = money(cents)
      end

      cells.map { |content| { content: content, font_style: :bold, background_color: "F5F5F5" } }
    end

    def style_table(table)
      table.columns(amount_index).align = :right if amount_index
    end

    def draw_closing(pdf, groups)
      return unless amount_index

      all = groups.flat_map { |cohort, _rows| grouped_entries.fetch(cohort) }

      pdf.move_down 14
      pdf.text "#{I18n.t('reports.expected_payments.total')}: #{money(all.sum(&:cents))}",
               size: 11, style: :bold
      pdf.text I18n.t("reports.expected_payments.summary",
                      students: all.size, uncontracted: all.count { |entry| !entry.contracted }),
               size: 8, color: "666666"
    end
  end
end
