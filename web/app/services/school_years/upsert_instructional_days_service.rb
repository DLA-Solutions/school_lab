# frozen_string_literal: true

module SchoolYears
  class UpsertInstructionalDaysService < ApplicationService
    # NOTE: `SchoolYear` has no `has_many :school_instructional_days` association (checked
    # app/models/school_year.rb) — querying through `SchoolInstructionalDay` directly with an
    # explicit `school_year:` scope instead. Adding the association is a model-layer change out of
    # scope here; flagged for follow-up.
    def initialize(school_year:, days:)
      @school_year = school_year
      @days = Array(days)
    end

    def call
      result = nil

      ActiveRecord::Base.transaction do
        records = days.map { |day| upsert_one(day) }
        failed = records.find { |record| record.errors.any? }

        if failed
          result = ResponseService.failure(code: :validation_error, details: failed.errors.to_hash)
          raise ActiveRecord::Rollback
        else
          result = ResponseService.success(data: records)
        end
      end

      result
    end

    private

    attr_reader :school_year, :days

    def upsert_one(day)
      attrs = day.to_h.symbolize_keys
      record = SchoolInstructionalDay.find_or_initialize_by(school_year: school_year, date: attrs[:date])
      record.instructional = ActiveModel::Type::Boolean.new.cast(attrs[:instructional])
      record.save
      record
    end
  end
end
