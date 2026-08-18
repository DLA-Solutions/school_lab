# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::AuditPiiRedactor do
  it "redacts values for sensitive keys" do
    redacted = described_class.call(
      "email" => "owner@example.com",
      "enabled" => [ true, false ]
    )

    expect(redacted.fetch("email")).to eq("[REDACTED]")
    expect(redacted.fetch("enabled")).to eq([ true, false ])
  end

  it "redacts PII patterns in non-sensitive string values" do
    redacted = described_class.call("notes" => "Contact secret@example.com or 11999990000")

    expect(redacted.fetch("notes")).to include("[EMAIL]")
    expect(redacted.fetch("notes")).not_to include("secret@example.com")
  end

  it "lists changed keys without values" do
    expect(described_class.changed_keys({ "enabled" => [ true, false ], "module_key" => "billing" }))
      .to eq(%w[enabled module_key])
  end
end
