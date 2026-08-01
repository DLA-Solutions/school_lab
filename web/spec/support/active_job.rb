# frozen_string_literal: true

RSpec.configure do |config|
  config.before do |example|
    if example.metadata[:file_path].include?("/spec/jobs/")
      ActiveJob::Base.queue_adapter = :solid_queue
    else
      ActiveJob::Base.queue_adapter = :test
    end
  end
end
