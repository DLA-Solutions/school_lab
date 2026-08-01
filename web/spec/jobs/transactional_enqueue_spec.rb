# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Solid Queue transactional enqueue" do
  before do
    stub_const("TransactionalEnqueueTestJob", Class.new(ApplicationJob) do
      queue_as :default

      def perform(*); end
    end)
  end

  it "does not persist jobs when the enclosing transaction rolls back" do
    expect do
      ActiveRecord::Base.transaction do
        TransactionalEnqueueTestJob.perform_later
        raise ActiveRecord::Rollback
      end
    end.not_to change(SolidQueue::Job, :count)
  end

  it "persists jobs when the enclosing transaction commits" do
    expect do
      ActiveRecord::Base.transaction do
        TransactionalEnqueueTestJob.perform_later
      end
    end.to change(SolidQueue::Job, :count).by(1)
  end
end
