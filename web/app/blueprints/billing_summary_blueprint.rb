# frozen_string_literal: true

class BillingSummaryBlueprint < Blueprinter::Base
  field :open_count
  field :overdue_count
  field :paid_this_month_count
  field :open_amount_cents
  field :overdue_amount_cents
  field :expected_collection_this_month_cents
end
