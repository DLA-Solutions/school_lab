# frozen_string_literal: true

# The list of people allowed to collect a child. Shared by the school's register and the guardian
# portal: it is the same list from both sides, and which students the caller may reach is what
# `policy_scope(Student)` already answers.
#
# Writing is not shared in practice — the policy allows it only to the family — but the actions
# live here so both routes answer the same shapes.
module AuthorizedPickupAccess
  extend ActiveSupport::Concern

  def index
    authorize AuthorizedPickup.new(student: student, school_id: student.school_id), :index?

    pickups = AuthorizedPickup.for_student(student.id).with_attached_photo

    render json: { data: AuthorizedPickupBlueprint.render_as_hash(pickups) }
  end

  def create
    pickup = AuthorizedPickup.new(
      pickup_params.except(:photo).merge(
        student: student,
        school_id: student.school_id,
        created_by: Current.user
      )
    )
    authorize pickup, :create?

    pickup.photo.attach(pickup_params[:photo]) if pickup_params[:photo].present?

    unless pickup.save
      return render_error(:validation_error, status: :unprocessable_content,
                                             details: pickup.errors.to_hash)
    end

    render json: { data: AuthorizedPickupBlueprint.render_as_hash(pickup) }, status: :created
  end

  # Withdrawn rather than deleted: who was allowed to collect the child on a given day is exactly
  # what gets asked after something goes wrong.
  def destroy
    pickup = AuthorizedPickup.kept.find_by!(id: params[:id], student_id: student.id)
    authorize pickup, :destroy?

    pickup.discard
    head :no_content
  end

  private

  def student
    @student ||= policy_scope(Student).find(params[:student_id])
  end

  def pickup_params
    params.require(:authorized_pickup).permit(:name, :cpf, :phone, :photo)
  end
end
