# frozen_string_literal: true

# Where the school signs from. The contract is between two parties, and until now only one of them
# was asked to sign it: the guardians were sent to the provider and the school received a copy.
# The school signs as the legal entity — identified by the CNPJ it already carries — so what was
# missing was the address the signature request goes to.
class AddSignatureEmailToSchools < ActiveRecord::Migration[8.1]
  def change
    add_column :schools, :signature_email, :string
  end
end
