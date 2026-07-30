# frozen_string_literal: true

class BillingSummaryBlueprint < Blueprinter::Base
  field :open_count
  field :overdue_count
  field :paid_this_month_count
  field :open_amount
  field :overdue_amount
  field :expected_collection_this_month
end
