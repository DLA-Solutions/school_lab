# frozen_string_literal: true

class SchoolTransactionBlueprint < Blueprinter::Base
  identifier :id

  fields :kind, :category, :description, :amount_cents, :occurred_on

  # What the movement did to the balance, so a listing can total a mixed set without re-deriving
  # the sign from `kind` on every row.
  field :signed_amount_cents
end
