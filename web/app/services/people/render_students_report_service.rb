# frozen_string_literal: true

module People
  # The student roll, grouped by cohort and laid out in teaching order, one class per page.
  #
  # The guardian columns name whoever is on file for the child: a class list is used to reach
  # families, and a roll with no way to contact anybody is half a document.
  class RenderStudentsReportService < RegisterReportService
    COLUMNS = {
      "name" => { header: "Estudante" },
      "cpf" => { header: "CPF" },
      "rg" => { header: "RG" },
      "birth_date" => { header: "Nascimento" },
      "status" => { header: "Situação" },
      "guardian_names" => { header: "Responsáveis" },
      "guardian_phones" => { header: "Telefones" }
    }.freeze

    DEFAULT_COLUMNS = %w[name birth_date guardian_names guardian_phones].freeze

    def initialize(school:, students:, columns: nil)
      @students = students
      super(school: school, columns: columns)
    end

    private

    attr_reader :students

    def available_columns = COLUMNS
    def default_columns = DEFAULT_COLUMNS
    def report_title = I18n.t("reports.students.title")
    def slug = "estudantes"

    def grouped_rows
      grouped = Hash.new { |hash, key| hash[key] = [] }

      students.each { |student| grouped[student.school_class] << row_for(student) }

      # Alphabetical within each cohort, which is how a class list is read.
      grouped.transform_values { |rows| rows.sort_by(&:first) }
    end

    def row_for(student)
      guardians = student.guardians.kept.to_a

      columns.map do |column|
        case column
        when "name" then student.name.to_s
        when "cpf" then Cpf.format(student.cpf).to_s
        when "rg" then student.rg.to_s
        when "birth_date" then student.birth_date&.strftime("%d/%m/%Y").to_s
        when "status" then I18n.t("reports.students.status.#{student.status}", default: student.status)
        when "guardian_names" then guardians.map(&:name).join(", ")
        when "guardian_phones" then guardians.map(&:phone).compact_blank.join(", ")
        end
      end
    end
  end
end
