# frozen_string_literal: true

# Reading and writing one child's health sheet. Shared by the school's own screen and the
# guardian portal: the sheet is the same record from both sides, and the only difference is which
# students the caller may reach — which `policy_scope(Student)` already answers.
module StudentHealthRecordAccess
  extend ActiveSupport::Concern

  def show
    record = health_record_for(student)
    authorize record, :show?

    render json: { data: StudentHealthRecordBlueprint.render_as_hash(record) }
  end

  def update
    record = health_record_for(student)
    authorize record, :update?

    content = params.require(:health_record).permit(:content)[:content]

    if content.to_s.length > StudentHealthRecord::MAX_CONTENT_LENGTH
      return render_error(:validation_error, status: :unprocessable_content,
                                             details: { content: [ I18n.t("api.errors.health_record_too_long",
                                                                          limit: StudentHealthRecord::MAX_CONTENT_LENGTH) ] })
    end

    record.write!(content, actor: Current.user)

    render json: { data: StudentHealthRecordBlueprint.render_as_hash(record.reload) }
  end

  private

  def student
    @student ||= policy_scope(Student).find(params[:student_id])
  end

  # Built on first read rather than alongside the student: a register full of untouched blank
  # rows would report every child as having a sheet when none of them does.
  def health_record_for(student)
    student.health_record || student.build_health_record(school_id: student.school_id)
  end
end
