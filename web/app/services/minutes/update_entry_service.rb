# frozen_string_literal: true

module Minutes
  # Edits a draft ata (UC-LA03). Only a draft can change (BR-LA05) — anything else is an invalid
  # state transition (409). The kind is fixed at creation and is never read from the payload. When
  # `participants` is given it replaces the whole list; when it is nil the list is left alone.
  class UpdateEntryService < ApplicationService
    ENTRY_FIELDS = %i[title held_on body].freeze

    def initialize(entry:, params:, participants: nil)
      @entry = entry
      @params = params.to_h.with_indifferent_access
      @participants = participants
    end

    def call
      entry.with_lock do
        return not_editable unless entry.editable?

        apply
      end
    end

    private

    attr_reader :entry, :params, :participants

    def apply
      entry.assign_attributes(params.slice(*ENTRY_FIELDS))

      moved = move_to_book
      return moved if moved.is_a?(ResponseService)

      classed = assign_school_class
      return classed if classed.is_a?(ResponseService)

      replacement = build_replacement
      return replacement if replacement.is_a?(ResponseService)

      save(replacement)
    end

    def move_to_book
      return unless params.key?(:minutes_book_id)

      book = entry.school.minutes_books.kept.find_by(id: params[:minutes_book_id])
      return failure(:minutes_book, "api.errors.minutes_book_not_found") if book.nil?

      entry.minutes_book = book
      nil
    end

    def assign_school_class
      return unless params.key?(:school_class_id)

      if params[:school_class_id].blank?
        entry.school_class = nil
        return
      end

      school_class = entry.school.school_classes.kept.find_by(id: params[:school_class_id])
      return failure(:school_class, "api.errors.minutes_school_class_not_found") if school_class.nil?

      entry.school_class = school_class
      nil
    end

    def build_replacement
      return if participants.nil?

      built = BuildParticipantsService.call(school: entry.school, entry: entry, participants: participants)
      built.failure? ? built : built.data
    end

    def save(replacement)
      ActiveRecord::Base.transaction do
        entry.save!
        unless replacement.nil?
          entry.minutes_participants.destroy_all
          replacement.each(&:save!)
        end
      end

      ResponseService.success(data: entry.reload)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    def not_editable
      ResponseService.failure(
        code: :invalid_state_transition,
        details: { base: [ I18n.t("api.errors.minutes_entry_not_editable") ] }
      )
    end

    def failure(field, key)
      ResponseService.failure(code: :validation_error, details: { field => [ I18n.t(key) ] })
    end
  end
end
