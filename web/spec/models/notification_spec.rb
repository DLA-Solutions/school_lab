# frozen_string_literal: true

require "rails_helper"

RSpec.describe Notification do
  let(:notification) { create(:notification) }

  it "starts unread" do
    expect(notification).not_to be_read
  end

  it "marks itself read once" do
    expect { notification.mark_read! }.to change(notification, :read?).from(false).to(true)

    first_read_at = notification.read_at
    notification.mark_read!

    expect(notification.read_at).to eq(first_read_at)
  end

  it "requires a kind and a title" do
    notification.kind = nil
    notification.title = nil

    expect(notification).not_to be_valid
    expect(notification.errors.attribute_names).to contain_exactly(:kind, :title)
  end
end
