# frozen_string_literal: true

module Dashboards
  # What the school's front page reports. Every headline number carries the movement that
  # produced it, so a figure can be read as "up from what" rather than as a bare total.
  #
  # Head-count growth is measured against the start of the calendar year: a student who enrolled
  # after 31 December counts as growth, one who left counts against it. Money is measured against
  # the previous month, which is the comparison a monthly figure invites.
  class SchoolMetricsService < ApplicationService
    def initialize(school:, month: nil)
      @school = school
      @month = month
    end

    def call
      ResponseService.success(
        data: {
          month: reference_month.strftime("%Y-%m"),
          students: students_metric,
          collaborators: collaborators_metric,
          average_ticket: average_ticket_metric,
          monthly_revenue: monthly_revenue_metric,
          didactic_material: didactic_material_metric,
          monthly_income_series: monthly_income_series,
          students_by_class: students_by_class
        }
      )
    end

    private

    attr_reader :school, :month

    # The month the money figures describe. Defaults to the current one; the dashboard lets the
    # school step back through the year.
    def reference_month
      @reference_month ||= parse_month(month) || Date.current.beginning_of_month
    end

    def year_start
      @year_start ||= Date.current.beginning_of_year
    end

    def students_metric
      metric(active_students_count, headcount_at_year_start(school.students))
    end

    # Staff, not families: a membership on the school side is a person who works here.
    def collaborators_metric
      memberships = school.memberships.where(role: "school")
      current = memberships.kept.where(status: "active").count

      metric(current, headcount_at_year_start(memberships))
    end

    # Who was already on the books on 31 December — created before the year turned and not yet
    # gone by then.
    def headcount_at_year_start(relation)
      relation.where(created_at: ...year_start)
              .where("discarded_at IS NULL OR discarded_at >= ?", year_start)
              .count
    end

    # What an enrolled child is worth per month on average: the tuition raised that month over
    # the students it was raised for. Before the month's charges exist there is nothing to
    # average, so it falls back to what the active contracts say the school expects to bill.
    def average_ticket_metric
      current = average_ticket_for(reference_month) || expected_average_ticket
      previous = average_ticket_for(reference_month.prev_month) || current

      metric(current, previous).merge(
        total_monthly_cents: active_contracts_monthly_cents,
        students: active_students_count
      )
    end

    # Nil rather than zero when the month has no tuition at all — an absent month is not a month
    # in which every family paid nothing.
    def average_ticket_for(period)
      charges = school.charges.kept.where(kind: "tuition", billing_period: period.beginning_of_month)
      students = charges.distinct.count(:contract_id)
      return nil if students.zero?

      (charges.sum(:total_amount_cents).to_f / students).round
    end

    def expected_average_ticket
      students = active_students_count
      return 0 if students.zero?

      (active_contracts_monthly_cents.to_f / students).round
    end

    def active_students_count
      @active_students_count ||= school.students.kept.where(status: "active").count
    end

    def active_contracts_monthly_cents
      school.contracts.active
            .left_joins(:billing_plan)
            .sum("COALESCE(contracts.negotiated_amount_cents, billing_plans.base_amount_cents, 0)")
    end

    # Tuition raised for the reference month, against the month before it.
    def monthly_revenue_metric
      current = tuition_cents_for(reference_month)
      previous = tuition_cents_for(reference_month.prev_month)

      metric(current, previous)
    end

    def tuition_cents_for(period)
      school.charges.kept
            .where(kind: "tuition", billing_period: period.beginning_of_month)
            .sum(:total_amount_cents)
    end

    # Textbooks and the like, sold at the counter rather than billed on a contract.
    def didactic_material_metric
      current = material_cents_for(reference_month)
      previous = material_cents_for(reference_month.prev_month)

      metric(current, previous)
    end

    def material_cents_for(period)
      school.school_transactions.income
            .where(category: "didactic_material", occurred_on: period.all_month)
            .sum(:amount_cents)
    end

    # Every month of the reference year, so the chart draws a full twelve points even for the
    # months that have not happened yet.
    def monthly_income_series
      year = reference_month.year
      totals = school.school_transactions.income
                     .where(occurred_on: Date.new(year, 1, 1)..Date.new(year, 12, 31))
                     .group("DATE_TRUNC('month', occurred_on)")
                     .sum(:amount_cents)

      normalized = totals.transform_keys { |key| key.to_date.beginning_of_month }

      (1..12).map do |number|
        first_of_month = Date.new(year, number, 1)
        { month: first_of_month.strftime("%Y-%m"), amount_cents: normalized[first_of_month].to_i }
      end
    end

    # How the enrolled children are spread across the cohorts, largest first. Students not yet in
    # a class are their own row: leaving them out would make the parts add up to less than the
    # total the card above reports, with nothing on screen to explain the gap.
    def students_by_class
      counts = school.students.kept.where(status: "active").group(:school_class_id).count
      classes = school.school_classes.kept.where(id: counts.keys.compact).index_by(&:id)

      rows = counts.map do |class_id, students|
        school_class = classes[class_id]

        {
          school_class_id: school_class&.id,
          name: school_class&.name,
          grade_level: school_class&.grade_level,
          year: school_class&.year,
          students: students
        }
      end

      # A discarded class leaves its students pointing nowhere; they join the unassigned row
      # rather than showing up under a cohort that no longer exists.
      rows.group_by { |row| row[:school_class_id] }
          .map { |_id, group| group.first.merge(students: group.sum { |row| row[:students] }) }
          .sort_by { |row| [ -row[:students], row[:name].to_s ] }
    end

    def metric(current, previous)
      {
        value: current,
        previous: previous,
        change_percent: percent_change(current, previous),
        is_up: current >= previous
      }
    end

    # A rise from nothing has no percentage — reporting 100% would read as a doubling. The
    # dashboard shows the figure itself in that case.
    def percent_change(current, previous)
      return 0.0 if previous.zero?

      (((current - previous).to_f / previous) * 100).round(1)
    end

    def parse_month(value)
      return nil if value.blank?

      string = value.to_s
      date = string.match?(/\A\d{4}-\d{2}\z/) ? Date.strptime(string, "%Y-%m") : Date.parse(string)
      date.beginning_of_month
    rescue ArgumentError, TypeError
      nil
    end
  end
end
