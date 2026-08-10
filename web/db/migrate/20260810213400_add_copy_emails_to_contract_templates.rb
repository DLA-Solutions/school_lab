# frozen_string_literal: true

# Who else receives the contract, besides the family who signs it.
#
# A school wants its own copy of every agreement that leaves — the secretary's inbox, the head's.
# Autentique takes these as `document.cc`, which delivers the document without asking the
# recipient to do anything; adding them as signers would have made the school sign its own
# contracts.
class AddCopyEmailsToContractTemplates < ActiveRecord::Migration[8.1]
  def change
    add_column :contract_templates, :copy_emails, :string, array: true, default: [], null: false
  end
end
