# frozen_string_literal: true

# One search box over a person's name and CPF, for the records that carry both.
#
# The two are matched with a single term because that is how a secretary searches: they type what
# they have in front of them — a name, or the document — without choosing a field first.
module PersonSearchable
  extend ActiveSupport::Concern

  class_methods do
    def search(term)
      normalized = term.to_s.strip
      return all if normalized.blank?

      # `sanitize_sql_like` escapes % and _ so a term containing them stays a literal search
      # rather than a wildcard the user did not ask for.
      name_pattern = "%#{sanitize_sql_like(normalized)}%"
      digits = normalized.gsub(/\D/, "")

      # CPF is stored as bare digits, so the term is stripped the same way before comparing —
      # "123.456" and "123456" have to find the same person.
      if digits.present?
        where(
          "#{table_name}.name ILIKE :name OR #{table_name}.cpf LIKE :cpf",
          name: name_pattern,
          cpf: "%#{sanitize_sql_like(digits)}%"
        )
      else
        where("#{table_name}.name ILIKE :name", name: name_pattern)
      end
    end
  end
end
