# frozen_string_literal: true

module Minutes
  # Turns the `participants` payload into unsaved snapshot rows for one entry (BR-LA04).
  #
  # Optional links (membership, guardian, student) are resolved through the school so a payload
  # can never attach another school's person — or crash on a dangling id. The snapshot fields
  # (name, e-mail, CPF, role label) come from the payload itself: the minutes keep what was true on
  # the day, whatever later happens to the person.
  class BuildParticipantsService < ApplicationService
    SNAPSHOT_FIELDS = %i[name role_label email cpf signs].freeze

    def initialize(school:, entry:, participants:)
      @school = school
      @entry = entry
      @participants = Array(participants)
    end

    def call
      errors = {}
      built = participants.each_with_index.map do |attributes, index|
        participant, dangling = build(attributes)
        collect_errors(participant, index, errors, dangling: dangling)
        participant
      end

      return ResponseService.success(data: built) if errors.empty?

      ResponseService.failure(code: :validation_error, details: errors)
    end

    private

    attr_reader :school, :entry, :participants

    def build(attributes)
      attributes = attributes.to_h.with_indifferent_access
      participant = MinutesParticipant.new(attributes.slice(*SNAPSHOT_FIELDS))
      participant.school = school
      participant.minutes_entry = entry
      participant.membership = linked(school.memberships.kept, attributes[:membership_id])
      participant.guardian = linked(school.guardians.kept, attributes[:guardian_id])
      participant.student = linked(school.students.kept, attributes[:student_id])
      [ participant, dangling_link?(attributes, participant) ]
    end

    def linked(scope, id)
      return if id.blank?

      scope.find_by(id: id)
    end

    def dangling_link?(attributes, participant)
      { membership_id: participant.membership, guardian_id: participant.guardian,
        student_id: participant.student }.any? { |key, record| attributes[key].present? && record.nil? }
    end

    def collect_errors(participant, index, errors, dangling:)
      participant.valid?
      participant.errors.each do |error|
        (errors["participants.#{index}.#{error.attribute}"] ||= []) << error.message
      end

      return unless dangling

      (errors["participants.#{index}.base"] ||= []) << I18n.t("api.errors.minutes_link_not_found")
    end
  end
end
