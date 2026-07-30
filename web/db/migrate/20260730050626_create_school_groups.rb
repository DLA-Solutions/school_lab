class CreateSchoolGroups < ActiveRecord::Migration[8.1]
  def change
    create_table :school_groups do |t|
      t.string :name
      t.string :headquarters_cnpj
      t.datetime :discarded_at

      t.timestamps
    end
  end
end
