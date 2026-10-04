# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # BC11 "Rotina Infantil" — the staff side: a teacher records/sends routine entries for
        # students in their own assigned classes (BR-DR07); manage_academic staff do the same for
        # any student in the school.
        class DailyRoutineEntriesController < BaseController
          TEMPLATE_PARAM_KEYS = %i[snack_eaten poop_count pee_count notes].freeze

          # GET /school_classes/:school_class_id/daily_routine_entries?date= — UC-DR01.
          def index
            authorize DailyRoutineEntry, :index?

            school_class = policy_scope(SchoolClass).find(params[:school_class_id])
            return render_not_teaching unless teaches_class?(school_class)

            date = roster_date
            students = school_class.students.kept.order(:name)
            entries = DailyRoutineEntry.where(school: Current.school, student: students, date: date)
                                       .index_by(&:student_id)

            render json: { data: students.map { |student| roster_row(student, entries[student.id]) } }
          end

          # PUT /daily_routine_entries — upsert by (student_id, date), BR-DR01/BR-DR04.
          def upsert
            student = find_student
            return render_error(:not_found, status: :not_found) if student.blank?

            authorize DailyRoutineEntry.new(student: student), :create?

            result = ::DailyRoutineEntries::UpsertDailyRoutineEntryService.call(
              student: student,
              date: entry_params[:date],
              attributes: entry_params.slice(*TEMPLATE_PARAM_KEYS),
              recorded_by_membership: Current.membership
            )
            render_service_result(result) do |entry|
              render json: { data: DailyRoutineEntryBlueprint.render_as_hash(entry) }
            end
          end

          # POST /daily_routine_entries/:id/send — UC-DR03. Idempotent (BR-DR04/AC-DR04).
          def send_entry
            entry = DailyRoutineEntry.where(school: Current.school).find(params[:id])
            authorize entry, :send?

            result = ::DailyRoutineEntries::SendDailyRoutineEntryService.call(
              entry: entry, sent_by_membership: Current.membership
            )
            render_service_result(result) do |sent_entry|
              render json: { data: DailyRoutineEntryBlueprint.render_as_hash(sent_entry) }
            end
          end

          private

          # Tenant-only lookup (not `policy_scope(Student)`, which demands `manage_people` — a
          # teacher recording a routine entry does not hold that permission and does not need it;
          # `authorize ..., :create?` below is the real narrowing). Same reasoning as
          # GradeBooksController#update_entry's roster lookup.
          def find_student
            Current.school.students.kept.find_by(id: entry_params[:student_id])
          end

          # A teacher records for the classes they are assigned to and no others (BR-DR07);
          # manage_academic staff are not narrowed this way. Mirrors
          # GradeBooksController#teaches?.
          def teaches_class?(school_class)
            return true unless Current.membership&.role == "teacher"

            teacher = Current.school.teachers.kept.find_by(email: Current.user.email)
            return false if teacher.blank?

            teacher.teaching_assignments.kept.exists?(school_class_id: school_class.id)
          end

          def render_not_teaching
            render_error(:not_your_lesson, status: :forbidden)
          end

          def roster_date
            params[:date].present? ? Date.parse(params[:date]) : Date.current
          rescue ArgumentError, TypeError
            Date.current
          end

          def roster_row(student, entry)
            {
              student_id: student.id,
              student_name: student.name,
              daily_routine_entry: entry ? DailyRoutineEntryBlueprint.render_as_hash(entry) : nil
            }
          end

          def entry_params
            params.require(:daily_routine_entry).permit(
              :student_id, :date, :snack_eaten, :poop_count, :pee_count, :notes
            )
          end
        end
      end
    end
  end
end
