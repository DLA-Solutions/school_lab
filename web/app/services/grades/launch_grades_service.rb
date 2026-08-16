# frozen_string_literal: true

module Grades
  # Appends a launched row with a digest covering current contributing inputs.
  class LaunchGradesService < ApplicationService
    def initialize(class_discipline:, academic_period:, launched_by_membership:, supersedes: nil)
      @class_discipline = class_discipline
      @academic_period = academic_period
      @launched_by_membership = launched_by_membership
      @supersedes = supersedes
    end

    def call
      return period_closed_failure if academic_period.closure_status == "closed"

      digest_result = ComputeInputDigestService.call(
        class_discipline: class_discipline,
        academic_period: academic_period
      )
      digest = digest_result.data[:digest]

      launch = GradeLaunch.create!(
        school: class_discipline.school,
        school_class: class_discipline.school_class,
        class_discipline: class_discipline,
        academic_period: academic_period,
        launched_by_membership: launched_by_membership,
        supersedes: supersedes,
        status: "launched",
        launched_at: Time.current,
        input_digest: digest
      )

      ResponseService.success(data: launch)
    rescue ActiveRecord::RecordNotUnique
      ResponseService.failure(code: :grade_launch_exists)
    end

    private

    attr_reader :class_discipline, :academic_period, :launched_by_membership, :supersedes

    def period_closed_failure
      ResponseService.failure(code: :period_closed)
    end
  end
end
