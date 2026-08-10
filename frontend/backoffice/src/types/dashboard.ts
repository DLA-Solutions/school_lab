/** Mirrors `Dashboards::SchoolMetricsService` (web/app/services/dashboards/). */

/**
 * A headline figure with the movement that produced it. `previous` is what it is compared
 * against — the start of the calendar year for head counts, the month before for money.
 */
export interface DashboardMetric {
  value: number;
  previous: number;
  change_percent: number;
  is_up: boolean;
}

/** Adds what the average was derived from, so the card can explain itself. */
export interface AverageTicketMetric extends DashboardMetric {
  total_monthly_cents: number;
  students: number;
}

export interface MonthlyIncomePoint {
  /** `YYYY-MM`. */
  month: string;
  amount_cents: number;
}

/** One cohort's share of the enrolled children. Null fields mean "in no class on the register". */
export interface StudentsByClassSlice {
  school_class_id: number | null;
  name: string | null;
  /** One of `SchoolClass::GRADE_LEVELS` — label it with `utils/gradeLevels`. */
  grade_level: string | null;
  year: number | null;
  students: number;
}

export interface DashboardMetrics {
  /** The month the money figures describe, `YYYY-MM`. */
  month: string;
  students: DashboardMetric;
  collaborators: DashboardMetric;
  average_ticket: AverageTicketMetric;
  monthly_revenue: DashboardMetric;
  didactic_material: DashboardMetric;
  /** Twelve points, one per month of the reference year. */
  monthly_income_series: MonthlyIncomePoint[];
  /** Largest cohort first; the slices add up to `students.value`. */
  students_by_class: StudentsByClassSlice[];
}
