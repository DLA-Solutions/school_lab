# frozen_string_literal: true

require "rails_helper"
require "rake"

RSpec.describe "billing:backfill_issuance_presentation", :solid_queue do
  let(:task) { Rake::Task["billing:backfill_issuance_presentation"] }
  let(:school) { create(:school) }
  let(:sync_jobs) { SolidQueue::Job.where(class_name: Billing::SyncIssuancePresentationJob.name) }

  before do
    Rails.application.load_tasks unless Rake::Task.task_defined?("billing:backfill_issuance_presentation")
    task.reenable
  end

  def issued_issuance(provider:, **fields)
    charge = create(:charge, school: school)
    create(:charge_issuance, :issued, charge: charge, school: school, provider: provider, **fields)
  end

  it "enqueues a sync for issued Inter issuances missing the boleto or Pix, and only those" do
    missing = issued_issuance(provider: "inter", digitable_line: nil, pix_emv: nil)
    issued_issuance(provider: "inter") # complete
    issued_issuance(provider: "fake", digitable_line: nil) # not an asynchronous provider

    expect { task.invoke }.to output(/Enqueued 1 /).to_stdout
    expect(sync_jobs.count).to eq(1)
    expect(sync_jobs.first.arguments["arguments"]).to eq([ missing.id, school.id ])
  end
end
