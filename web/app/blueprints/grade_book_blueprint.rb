# frozen_string_literal: true

# The grid a teacher fills in: the roster down, the year's periods across — each period showing
# its own template's components, since one period's template can differ in component count or
# weights from another's.
#
# Rendered whole rather than as a list of grade entries, because the empty cells are the point —
# a teacher needs to see which marks are still missing, and a collection of the marks that exist
# cannot show that.
class GradeBookBlueprint < Blueprinter::Base
  view :default do
    field :context do |book|
      {
        school_class_id: book[:school_class].id,
        school_class_label: book[:school_class].full_name,
        subject_id: book[:subject].id,
        subject_name: book[:subject].name,
        class_discipline_id: book[:class_discipline].id,
        year: book[:year]
      }
    end

    field :periods do |book|
      book[:periods].map do |period|
        {
          id: period.id,
          name: period.name,
          sequence: period.sequence,
          # A closed period is read-only: the grid greys it out rather than letting a teacher
          # type into something the API will refuse.
          closed: period.closure_status == "closed",
          components: book[:components_by_period][period].map do |component|
            {
              id: component.id,
              name: component.name,
              position: component.position,
              weight_percent: component.weight_percent.to_f
            }
          end
        }
      end
    end

    field :students do |book|
      book[:students].map do |student|
        {
          id: student.id,
          name: student.name,
          entries: book[:periods].to_h do |period|
            components = book[:components_by_period][period]
            cells = components.filter_map do |component|
              entry = book[:entries][[ student.id, period.id, component.id ]]
              next if entry.blank?

              # `GradeEntry#value` is a plain string that may hold a concept/rubric grade
              # (`GradeScale.scale_type`), not only a number — cast to float only when it looks
              # numeric, otherwise ship the raw string so a non-numeric scale is not corrupted.
              [ component.id.to_s, GradeBookBlueprint.numeric_value(entry.value) ]
            end

            [ period.id.to_s, cells.to_h ]
          end
        }
      end
    end
  end

  def self.numeric_value(value)
    return value if value.blank?

    Float(value)
  rescue ArgumentError, TypeError
    value
  end
end
