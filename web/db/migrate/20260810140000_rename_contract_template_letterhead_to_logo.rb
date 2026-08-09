# frozen_string_literal: true

# The image stopped being a background the page is printed on and became the school's logo, shown
# above the title. Active Storage keys an attachment by name, so the existing rows are renamed
# rather than orphaned.
class RenameContractTemplateLetterheadToLogo < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL.squish
      UPDATE active_storage_attachments
      SET name = 'logo'
      WHERE record_type = 'ContractTemplate' AND name = 'letterhead'
    SQL
  end

  def down
    execute <<~SQL.squish
      UPDATE active_storage_attachments
      SET name = 'letterhead'
      WHERE record_type = 'ContractTemplate' AND name = 'logo'
    SQL
  end
end
