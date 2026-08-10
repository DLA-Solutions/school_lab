# frozen_string_literal: true

# The school no longer says where the signature goes.
#
# These coordinates were measured against our own render, but the agreement is uploaded as HTML
# and the provider lays the page out when it converts the file — so a position taken here landed
# somewhere arbitrary on theirs. Autentique places the field itself, which is the only party that
# knows the finished pagination.
#
# Reversible: rolling back restores the columns with the defaults the form used to start on.
class RemoveSignaturePositionFromContractTemplates < ActiveRecord::Migration[8.1]
  def change
    remove_column :contract_templates, :signature_x, :decimal, precision: 5, scale: 2, default: "10.0", null: false
    remove_column :contract_templates, :signature_y, :decimal, precision: 5, scale: 2, default: "85.0", null: false
    remove_column :contract_templates, :signature_page, :integer, default: 1, null: false
  end
end
