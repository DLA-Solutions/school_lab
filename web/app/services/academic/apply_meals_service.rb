# frozen_string_literal: true

module Academic
  # Fills one meal column for every enrolled child in the class, and only where that column
  # is still null. Does not send the card and does not replace a value a teacher already set.
  class ApplyMealsService < ApplicationService
    def initialize(school:, teacher:, school_class:, date:, field:, value:)
      @school = school
      @teacher = teacher
      @school_class = school_class
      @date = date
      @field = field.to_s
      @value = value
    end

    def call
      return ResponseService.failure(code: :not_found) unless school_class.school_id == school.id
      return ResponseService.failure(code: :not_infantil) unless school_class.infantil?
      return ResponseService.failure(code: :validation_error) if parsed_date.nil?
      return ResponseService.failure(code: :routine_day_locked) if parsed_date < DailyRoutine.today
      return ResponseService.failure(code: :invalid_meal_field) unless meal_input_allowed?

      routines = []
      ActiveRecord::Base.transaction do
        routines = recipients.map { |student| fill_meal(student) }
      end

      ResponseService.success(data: { routines: routines.sort_by(&:student_id) })
    end

    private

    attr_reader :school, :teacher, :school_class, :date, :field, :value

    def parsed_date
      return if date.blank?
      return date if date.is_a?(Date)
      return date.to_date if date.respond_to?(:to_date) && !date.is_a?(String)

      Date.iso8601(date.to_s)
    rescue ArgumentError, TypeError
      nil
    end

    def meal_input_allowed?
      DailyRoutine::MEAL_FIELDS.include?(field) && DailyRoutine::MEAL_VALUES.include?(value)
    end

    def recipients
      Student.kept.where(school_id: school.id, school_class_id: school_class.id, status: "active").order(:id)
    end

    def fill_meal(student)
      routine = DailyRoutine.find_by(school_id: school.id, student_id: student.id, date: parsed_date)
      if routine
        assign_if_blank(routine)
        return routine
      end

      create_draft(student)
    rescue ActiveRecord::RecordNotUnique
      routine = DailyRoutine.find_by!(school_id: school.id, student_id: student.id, date: parsed_date)
      assign_if_blank(routine)
      routine
    end

    def assign_if_blank(routine)
      return if routine.public_send(field).present?

      routine.update!(field => value)
    end

    def create_draft(student)
      DailyRoutine.transaction(requires_new: true) do
        DailyRoutine.create!(
          school: school,
          student: student,
          school_class: school_class,
          author: teacher,
          date: parsed_date,
          status: "draft",
          field => value
        )
      end
    end
  end
end
