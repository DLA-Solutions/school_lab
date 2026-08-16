# frozen_string_literal: true

# The grid a teacher fills in: the students of one class down, the year's periods across, and
# whatever mark each cell already holds.
#
# Rendered whole rather than as a list of grades, because the empty cells are the point — a
# teacher needs to see which marks are still missing, and a collection of the marks that exist
# cannot show that.
class GradeSheetBlueprint < Blueprinter::Base
  view :default do
    field :periods do |sheet|
      sheet[:periods].map do |period|
        {
          id: period.id,
          name: period.name,
          sequence: period.sequence,
          # A closed period is read-only: the grid greys it out rather than letting a teacher
          # type into something the API will refuse.
          closed: period.closure_status == "closed"
        }
      end
    end

    field :students do |sheet|
      sheet[:students].map do |student|
        {
          id: student.id,
          name: student.name,
          scores: sheet[:periods].to_h do |period|
            grade = sheet[:grades][[ student.id, period.id ]]
            [ period.id, grade&.score&.to_f ]
          end
        }
      end
    end
  end
end
