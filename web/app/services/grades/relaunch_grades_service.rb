# frozen_string_literal: true

module Grades
  # Appends a replacement launch after invalidation with a fresh digest.
  class RelaunchGradesService < ApplicationService
    def initialize(class_discipline:, academic_period:, launched_by_membership:)
      @class_discipline = class_discipline
      @academic_period = academic_period
      @launched_by_membership = launched_by_membership
    end

    def call
      prior = GradeLaunch.where(
        school_id: class_discipline.school_id,
        class_discipline: class_discipline,
        academic_period: academic_period
      ).order(launched_at: :desc).first

      return ResponseService.failure(code: :no_prior_launch) if prior.blank?
      return ResponseService.failure(code: :launch_still_current) if prior.launched?

      LaunchGradesService.call(
        class_discipline: class_discipline,
        academic_period: academic_period,
        launched_by_membership: launched_by_membership,
        supersedes: prior
      )
    end

    private

    attr_reader :class_discipline, :academic_period, :launched_by_membership
  end
end
