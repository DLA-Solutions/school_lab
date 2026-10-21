# frozen_string_literal: true

module Minutes
  # Writes a new ata as a draft (UC-LA02). The book and the optional class are looked up through
  # the school, so an id from another school is a validation error rather than a way to reach it.
  # The entry and its participants are saved together or not at all.
  class CreateEntryService < ApplicationService
    ENTRY_FIELDS = %i[kind title held_on body].freeze

    def initialize(school:, params:, participants: [], membership: nil)
      @school = school
      @params = params.to_h.with_indifferent_access
      @participants = participants
      @membership = membership
    end

    def call
      book = school.minutes_books.kept.find_by(id: params[:minutes_book_id])
      return failure(:minutes_book, "api.errors.minutes_book_not_found") if book.nil?

      entry = school.minutes_entries.build(params.slice(*ENTRY_FIELDS))
      entry.minutes_book = book
      entry.created_by_membership = membership

      school_class = resolve_school_class
      return failure(:school_class, "api.errors.minutes_school_class_not_found") if school_class == :missing

      entry.school_class = school_class

      built = BuildParticipantsService.call(school: school, entry: entry, participants: participants)
      return built if built.failure?

      save(entry, built.data)
    end

    private

    attr_reader :school, :params, :participants, :membership

    def resolve_school_class
      return if params[:school_class_id].blank?

      school.school_classes.kept.find_by(id: params[:school_class_id]) || :missing
    end

    def save(entry, built_participants)
      ActiveRecord::Base.transaction do
        entry.save!
        built_participants.each(&:save!)
      end

      ResponseService.success(data: entry.reload)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    def failure(field, key)
      ResponseService.failure(code: :validation_error, details: { field => [ I18n.t(key) ] })
    end
  end
end
