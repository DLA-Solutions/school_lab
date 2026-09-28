# frozen_string_literal: true

# CRUD for a child's health records. Shared by the school's register and the guardian portal.
module StudentHealthRecordAccess
  extend ActiveSupport::Concern

  def index
    authorize StudentHealthRecord.new(student: student, school_id: student.school_id), :index?

    records = StudentHealthRecord.for_student(student.id).with_attached_document

    render json: { data: StudentHealthRecordBlueprint.render_as_hash(records) }
  end

  def show
    record = find_record
    authorize record, :show?

    render json: { data: StudentHealthRecordBlueprint.render_as_hash(record) }
  end

  def create
    record = StudentHealthRecord.new(
      record_params.except(:document).merge(
        student: student,
        school_id: student.school_id,
        created_by: Current.user,
        updated_by: Current.user,
        content_updated_at: Time.current
      )
    )
    authorize record, :create?

    record.document.attach(record_params[:document]) if record_params[:document].present?

    unless record.save
      return render_error(:validation_error, status: :unprocessable_content,
                                             details: record.errors.to_hash)
    end

    render json: { data: StudentHealthRecordBlueprint.render_as_hash(record) }, status: :created
  end

  def update
    record = find_record
    authorize record, :update?

    record.assign_attributes(record_params.except(:document))
    record.updated_by = Current.user
    record.content_updated_at = Time.current

    if record_params[:document].present?
      record.document.purge if record.document.attached?
      record.document.attach(record_params[:document])
    end

    unless record.save
      return render_error(:validation_error, status: :unprocessable_content,
                                             details: record.errors.to_hash)
    end

    render json: { data: StudentHealthRecordBlueprint.render_as_hash(record) }
  end

  def destroy
    record = find_record
    authorize record, :destroy?

    record.discard
    head :no_content
  end

  private

  def student
    @student ||= policy_scope(Student).find(params[:student_id])
  end

  def find_record
    StudentHealthRecord.kept.find_by!(id: params[:id], student_id: student.id)
  end

  def record_params
    params.require(:health_record).permit(:title, :content, :document)
  end
end
