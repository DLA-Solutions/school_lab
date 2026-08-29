# frozen_string_literal: true

RSpec.configure do |config|
  config.before do |example|
    needs_solid_queue =
      example.metadata[:solid_queue] ||
      example.metadata[:file_path].end_with?("transactional_enqueue_spec.rb") ||
      example.metadata[:file_path].include?("/spec/jobs/billing/")

    ActiveJob::Base.queue_adapter = needs_solid_queue ? :solid_queue : :test
  end
end
