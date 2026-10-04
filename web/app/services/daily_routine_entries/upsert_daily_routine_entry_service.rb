# frozen_string_literal: true

module DailyRoutineEntries
  # Upsert by (student, date) — BR-DR01/UC-DR02. Each icon tap or notes edit is its own immediate
  # call; `status` is never touched here (BR-DR04): a new row defaults to `draft` (DB/model
  # default), and an existing `sent` row stays `sent` — this service never reverts it.
  class UpsertDailyRoutineEntryService < ApplicationService
    FIELDS = %i[snack_eaten poop_count pee_count notes].freeze

    def initialize(student:, date:, attributes: {}, recorded_by_membership: nil)
      @student = student
      @date = date
      @attributes = attributes
      @recorded_by_membership = recorded_by_membership
    end

    def call
      entry = DailyRoutineEntry.find_or_initialize_by(student: student, date: date)
      entry.school ||= student.school
      entry.assign_attributes(template_attributes)
      entry.recorded_by_membership = recorded_by_membership if recorded_by_membership.present?

      unless entry.save
        return ResponseService.failure(code: :validation_error, details: entry.errors.to_hash)
      end

      ResponseService.success(data: entry)
    end

    private

    attr_reader :student, :date, :attributes, :recorded_by_membership

    def template_attributes
      attributes.to_h.symbolize_keys.slice(*FIELDS)
    end
  end
end
