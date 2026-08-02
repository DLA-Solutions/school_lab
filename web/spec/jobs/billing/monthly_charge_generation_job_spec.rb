# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::MonthlyChargeGenerationJob, type: :job do
  let(:billing_period) { Date.current.beginning_of_month }

  def generate_charge_jobs
    SolidQueue::Job.where(class_name: Billing::GenerateChargesJob.name)
  end

  it "enqueues GenerateChargesJob for each school with an active payment provider" do
    school_one = create(:school)
    school_two = create(:school)
    create(:school_payment_provider, school: school_one)
    create(:school_payment_provider, school: school_two)

    expect do
      described_class.perform_now
    end.to change { generate_charge_jobs.count }.by(2)
  end

  it "continues when one school fails to enqueue" do
    school_one = create(:school)
    school_two = create(:school)
    create(:school_payment_provider, school: school_one)
    create(:school_payment_provider, school: school_two)

    allow(Billing::GenerateChargesJob).to receive(:perform_later).and_wrap_original do |method, **args|
      raise StandardError, "enqueue failed" if args.fetch(:school_id) == school_two.id

      method.call(**args)
    end

    expect { described_class.perform_now }.not_to raise_error
    expect(generate_charge_jobs.count).to eq(1)
  end

  it "redacts personal data from logged enqueue failures" do
    school = create(:school)
    create(:school_payment_provider, school: school)

    allow(Billing::GenerateChargesJob).to receive(:perform_later)
      .and_raise(StandardError, "guardian 123.456.789-00 (maria@example.com) is invalid")

    expect(Rails.logger).to receive(:error).with(
      hash_including(error: include("[CPF]").and(include("[EMAIL]")))
    )
    allow(Rails.logger).to receive(:info)

    described_class.perform_now
  end

  it "does not enqueue jobs for schools without an active payment provider" do
    school_with_provider = create(:school)
    school_without_provider = create(:school)
    create(:school_payment_provider, school: school_with_provider)
    create(:school_payment_provider, :inactive, school: school_without_provider)

    expect do
      described_class.perform_now
    end.to change { generate_charge_jobs.count }.by(1)
  end
end
