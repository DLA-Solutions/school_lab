export type YesNo = 'yes' | 'no';
export type MealAmount = 'great' | 'regular' | 'refused';
export type RoutineStatus = 'draft' | 'sent';

/**
 * An Infantil day card.
 *
 * Staff responses include null answers. Guardian responses omit those keys, so every answer is
 * optional here and a missing key is "not marked", never a "no".
 */
export interface DailyRoutine {
  id: number;
  student_id: number;
  school_class_id: number;
  date: string;
  author_id?: number | null;
  narrative?: string | null;
  sleep_morning?: YesNo | null;
  sleep_after_lunch?: YesNo | null;
  sleep_afternoon?: YesNo | null;
  interaction?: YesNo | null;
  evacuation?: YesNo | null;
  discomfort?: YesNo | null;
  discomfort_detail?: string | null;
  meal_breakfast?: MealAmount | null;
  meal_lunch?: MealAmount | null;
  meal_afternoon_snack?: MealAmount | null;
  meal_dinner?: MealAmount | null;
  meal_hydration?: MealAmount | null;
  status: RoutineStatus;
  sent_at?: string | null;
  attachment_ids?: number[];
}

export type MealField =
  | 'meal_breakfast'
  | 'meal_lunch'
  | 'meal_afternoon_snack'
  | 'meal_dinner'
  | 'meal_hydration';

export interface DailyRoutineInput {
  student_id: number;
  date: string;
  narrative: string | null;
  sleep_morning: YesNo | null;
  sleep_after_lunch: YesNo | null;
  sleep_afternoon: YesNo | null;
  interaction: YesNo | null;
  evacuation: YesNo | null;
  discomfort: YesNo | null;
  discomfort_detail: string | null;
  meal_breakfast: MealAmount | null;
  meal_lunch: MealAmount | null;
  meal_afternoon_snack: MealAmount | null;
  meal_dinner: MealAmount | null;
  meal_hydration: MealAmount | null;
  attachment_ids: number[];
}
