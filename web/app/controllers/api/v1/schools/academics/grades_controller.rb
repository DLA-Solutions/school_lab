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
            return render_wrong_year unless period_belongs_to_class_year?(period, school_class)

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
            # The class's own year decides which periods the sheet marks. Matched on the school
            # year's dates rather than on its name, and with no fallback: a sheet that quietly
            # widened to every period the school has ever had would take a mark meant for this
            # year and file it under a period of another one.
            periods = policy_scope(AcademicPeriod)
                      .joins(:school_year)
                      .merge(SchoolYear.kept.for_calendar_year(school_class.year))
                      .order(:sequence)

            students = school_class.students.kept.order(:name)
            grades = policy_scope(Grade)
                     .where(subject: subject, student: students, academic_period: periods)
                     .index_by { |grade| [ grade.student_id, grade.academic_period_id ] }

            { school_class: school_class, subject: subject, year: school_class.year,
              periods: periods.to_a, students: students.to_a, grades: grades }
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

          # The sheet only offers the class's own periods, but the endpoint takes an id and has to
          # hold the same line on its own — a mark belongs to a period of the year the class is
          # taught in, and to no other.
          def period_belongs_to_class_year?(period, school_class)
            period.school_year.starts_on.year == school_class.year
          end

          def render_wrong_year
            render_error(:validation_error, status: :unprocessable_content,
                                            details: { academic_period: [ I18n.t("api.errors.period_outside_class_year") ] })
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
