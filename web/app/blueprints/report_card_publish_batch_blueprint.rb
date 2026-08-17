# frozen_string_literal: true

class ReportCardPublishBatchBlueprint < Blueprinter::Base
  identifier :id

  fields :status, :mode, :requested_count, :released_count,
         :failed_count, :blockers, :completed_at, :created_at

  field :class_id do |batch|
    batch.school_class_id
  end

  field :academic_period_id do |batch|
    batch.academic_period_id
  end

  field :batch_id, &:id

  field :schedule_id do |batch|
    batch.report_card_publish_schedule&.id
  end

  field :atomic do |_batch|
    true
  end

  field :scheduled_for do |batch|
    batch.report_card_publish_schedule&.scheduled_for&.iso8601
  end

  field :school_timezone do |batch|
    batch.report_card_publish_schedule&.school_timezone || batch.school.timezone
  end

  field :results do |batch, options|
    options[:results] || []
  end

  field :counts do |batch|
    {
      requested: batch.requested_count,
      released: batch.released_count,
      failed: batch.failed_count
    }
  end
end
