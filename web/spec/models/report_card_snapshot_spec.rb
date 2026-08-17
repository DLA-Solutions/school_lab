# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReportCardSnapshot do
  it "refuses in-place mutation with report_card_frozen" do
    snapshot = create(:report_card_snapshot)

    expect { snapshot.update!(snapshot: { "changed" => true }) }
      .to raise_error(ActiveRecord::ReadOnlyRecord, "report_card_frozen")
  end
end
