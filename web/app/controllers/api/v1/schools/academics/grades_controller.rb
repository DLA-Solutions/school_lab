# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # The mark sheet for one class and one subject: the students down, the year's periods
        # across. Read whole and written a cell at a time, which is what lets the screen save each
        # mark as it is typed rather than asking a teacher to remember to press save.
        class GradesController < BaseController
          def index
            authorize Grade

            school_class = policy_scope(SchoolClass).find(params[:school_class_id])
            subject = policy_scope(Subject).find(params[:subject_id])
            return render_not_teaching unless teaches?(school_class, subject)

            render json: { data: GradeSheetBlueprint.render_as_hash(sheet_for(school_class, subject)) }
          end

          # One cell. `PUT` rather than `POST`: the mark for a student in a subject in a period is
          # one thing whether or not it has been given yet, and the screen re-sends it whenever it
          # changes.
          def cell
            authorize Grade, :update?

            school_class = policy_scope(SchoolClass).find(params[:school_class_id])
            subject = policy_scope(Subject).find(params[:subject_id])
            return render_not_teaching unless teaches?(school_class, subject)

            student = policy_scope(Student).find(cell_params[:student_id])
            period = policy_scope(AcademicPeriod).find(cell_params[:academic_period_id])

            grade = Grade.kept.find_or_initialize_by(
              student: student, subject: subject, academic_period: period
            )
            grade.assign_attributes(
              school: Current.school,
              school_class: school_class,
              recorded_by: Current.user,
              score: cell_params[:score]
            )

            if grade.save
              render json: { data: { student_id: student.id, academic_period_id: period.id,
                                     score: grade.score&.to_f } }
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: grade.errors.to_hash)
            end
          end

          private

          # Everything the grid needs in one read: the roll, the year's periods, and the marks
          # already given, keyed so the blueprint can find a cell without scanning.
          def sheet_for(school_class, subject)
            periods = policy_scope(AcademicPeriod)
                      .joins(:school_year)
                      .where(school_years: { name: school_class.year.to_s })
                      .order(:sequence)
            periods = policy_scope(AcademicPeriod).order(:sequence) if periods.empty?

            students = school_class.students.kept.order(:name)
            grades = policy_scope(Grade)
                     .where(subject: subject, student: students, academic_period: periods)
                     .index_by { |grade| [ grade.student_id, grade.academic_period_id ] }

            { periods: periods.to_a, students: students.to_a, grades: grades }
          end

          # A teacher marks the lessons they are assigned to and no others. Staff who administer
          # the school — anyone holding the permission without being a teacher — are not narrowed
          # this way, since they are the ones who fix a mark after the teacher has gone.
          def teaches?(school_class, subject)
            return true unless Current.membership&.role == "teacher"

            teacher = Current.school.teachers.kept.find_by(email: Current.user.email)
            return false if teacher.blank?

            teacher.teaching_assignments.kept.exists?(
              school_class_id: school_class.id, subject_id: subject.id
            )
          end

          def render_not_teaching
            render_error(:forbidden, status: :forbidden,
                                     details: { base: [ I18n.t("api.errors.not_your_lesson") ] })
          end

          def cell_params
            params.require(:grade).permit(:student_id, :academic_period_id, :score)
          end
        end
      end
    end
  end
end
