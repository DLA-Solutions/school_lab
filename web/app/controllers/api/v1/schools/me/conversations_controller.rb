# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # Linked children, for the family. Same shape as the teacher's list: a child with no
        # thread yet is still a row, and opening the list does not create one.
        class ConversationsController < BaseController
          def index
            return render_not_found unless policy(Conversation).index?

            students = visible_students.includes(:school_class).order(:name)
            pagy, records = pagy(students)

            render json: {
              data: FamilyThreadBlueprint.render_as_hash(
                records,
                conversations_by_student_id: conversations_for(records)
              ),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          private

          def visible_students
            linked_ids = Current.guardian.student_guardians.kept.select(:student_id)
            Current.school.students.kept.where(id: linked_ids, status: "active")
          end

          def conversations_for(students)
            Conversation.kept.where(school_id: Current.school.id, student_id: students.map(&:id))
                        .index_by(&:student_id)
          end
        end
      end
    end
  end
end
