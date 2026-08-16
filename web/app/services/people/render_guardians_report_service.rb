# frozen_string_literal: true

module People
  # The guardian register, grouped by the cohort their child is in and laid out in teaching order.
  #
  # A guardian with more than one child enrolled appears under each of their cohorts — the school
  # printing this is handing a page to a class, and a family with children in two classes belongs
  # on both. A guardian with no child on the roll is printed last, under their own heading: they
  # are on the register, and leaving them out would make the report disagree with the listing.
  class RenderGuardiansReportService < RegisterReportService
    COLUMNS = {
      "name" => { header: "Responsável" },
      "cpf" => { header: "CPF" },
      "phone" => { header: "Telefone" },
      "email" => { header: "E-mail" },
      "student_name" => { header: "Filho(a)" },
      "student_class" => { header: "Turma" }
    }.freeze

    # The cohort now heads each page, so it is no longer a column by default.
    DEFAULT_COLUMNS = %w[name cpf phone student_name].freeze

    def initialize(school:, guardians:, columns: nil)
      @guardians = guardians
      super(school: school, columns: columns)
    end

    private

    attr_reader :guardians

    def available_columns = COLUMNS
    def default_columns = DEFAULT_COLUMNS
    def report_title = I18n.t("reports.guardians.title")
    def slug = "responsaveis"

    def grouped_rows
      grouped = Hash.new { |hash, key| hash[key] = [] }

      guardians.each do |guardian|
        students = guardian.students.kept.to_a

        if students.empty?
          grouped[nil] << row_for(guardian, nil)
        else
          students.each { |student| grouped[student.school_class] << row_for(guardian, student) }
        end
      end

      # Alphabetical within each cohort, which is how a class list is read.
      grouped.transform_values { |rows| rows.sort_by(&:first) }
    end

    def row_for(guardian, student)
      columns.map do |column|
        case column
        when "name" then guardian.name.to_s
        when "cpf" then Cpf.format(guardian.cpf).to_s
        when "phone" then guardian.phone.to_s
        when "email" then guardian.email.to_s
        when "student_name" then student&.name.to_s
        # Named in full: the letter alone repeats in every grade and both shifts.
        when "student_class" then student&.school_class&.full_name.to_s
        end
      end
    end
  end
end
