# frozen_string_literal: true

module Academic
  # Inserts or updates one infantil card for a child and a civil date. Does not post a thread
  # message: a card already sent keeps pointing at this row via daily_routine_id.
  class UpsertDailyRoutineService < ApplicationService
    ASSIGNABLE_FIELDS = %i[
      narrative
      sleep_morning sleep_after_lunch sleep_afternoon
      interaction evacuation discomfort discomfort_detail
      meal_breakfast meal_lunch meal_afternoon_snack meal_dinner meal_hydration
    ].freeze

    def initialize(school:, teacher:, student:, attributes:, attachment_ids: nil, uploaded_by: nil)
      @school = school
      @teacher = teacher
      @student = student
      @attributes = attributes
      @attachment_ids = attachment_ids
      @uploaded_by = uploaded_by
    end

    def call
      return ResponseService.failure(code: :not_found) unless student.school_id == school.id
      return ResponseService.failure(code: :not_infantil) unless student.school_class&.infantil?

      date = parsed_date
      return ResponseService.failure(code: :validation_error) if date.nil?
      return ResponseService.failure(code: :routine_day_locked) if date < DailyRoutine.today

      routine = nil
      error = nil

      ActiveRecord::Base.transaction do
        routine = locate_routine(date)
        apply_content(routine)
        unless discomfort_pair_ok?(routine)
          error = :discomfort_detail_required
          raise ActiveRecord::Rollback
        end

        routine = persist_routine(routine, date)
        if routine.is_a?(Symbol)
          error = routine
          raise ActiveRecord::Rollback
        end

        error = claim_attachments(routine)
        raise ActiveRecord::Rollback if error
      end

      return ResponseService.failure(code: error) if error

      ResponseService.success(data: routine)
    end

    private

    attr_reader :school, :teacher, :student, :attributes, :attachment_ids, :uploaded_by

    def parsed_date
      raw = attributes.to_h.symbolize_keys[:date]
      return if raw.blank?
      return raw if raw.is_a?(Date)
      return raw.to_date if raw.respond_to?(:to_date) && !raw.is_a?(String)

      Date.iso8601(raw.to_s)
    rescue ArgumentError, TypeError
      nil
    end

    def content_attributes
      attributes.to_h.symbolize_keys.slice(*ASSIGNABLE_FIELDS)
    end

    def locate_routine(date)
      DailyRoutine.find_by(school_id: school.id, student_id: student.id, date: date) ||
        DailyRoutine.new(
          school: school,
          student: student,
          school_class: student.school_class,
          author: teacher,
          date: date,
          status: "draft",
          sent_at: nil
        )
    end

    # Only keys the caller sent. Status, sent_at, and author stay put on an existing card
    # so a same-day edit does not unsend it or rewrite who opened it.
    def apply_content(routine)
      routine.assign_attributes(content_attributes)
    end

    # valid? nilifies blank strings the way the model will on save. The pair is judged after
    # that, and a mismatch is refused here so the API code stays discomfort_detail_required.
    def discomfort_pair_ok?(routine)
      routine.valid?
      ok = if routine.discomfort == "yes"
        routine.discomfort_detail.present?
      else
        routine.discomfort_detail.blank?
      end
      routine.errors.clear
      ok
    end

    def persist_routine(routine, date)
      DailyRoutine.transaction(requires_new: true) do
        routine.save!
        routine
      end
    rescue ActiveRecord::RecordNotUnique
      existing = DailyRoutine.find_by!(school_id: school.id, student_id: student.id, date: date)
      apply_content(existing)
      return :discomfort_detail_required unless discomfort_pair_ok?(existing)

      existing.save!
      existing
    end

    # nil means the caller did not mention files. An array claims those ids onto this card
    # and leaves every other attachment where it is.
    def claim_attachments(routine)
      return nil if attachment_ids.nil?

      ids = Array(attachment_ids).map { |id| Integer(id, exception: false) }
      return :not_found if ids.any?(&:nil?)

      ids = ids.uniq
      return :too_many_files if ids.size > CommunicationAttachment::MAX_PER_OWNER

      rows = CommunicationAttachment.lock.where(id: ids).order(:id).index_by(&:id)
      return :not_found if rows.size != ids.size

      ids.each do |id|
        return :not_found unless claimable?(rows.fetch(id), routine)
      end

      existing_ids = routine.communication_attachments.pluck(:id)
      return :too_many_files if (existing_ids | ids).size > CommunicationAttachment::MAX_PER_OWNER

      ids.each do |id|
        attachment = rows.fetch(id)
        next if attachment.daily_routine_id == routine.id

        attachment.update!(daily_routine: routine)
      end

      nil
    end

    def claimable?(attachment, routine)
      return false unless attachment.school_id == school.id
      return false unless uploaded_by && attachment.uploaded_by_membership_id == uploaded_by.id
      return false if attachment.message_id.present?
      return false if attachment.daily_routine_id.present? && attachment.daily_routine_id != routine.id

      true
    end
  end
end
