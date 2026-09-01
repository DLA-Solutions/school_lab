# frozen_string_literal: true

# Reading and writing a child's structured health profile. Shared by the school's register and the
# guardian portal.
module StudentHealthProfileAccess
  extend ActiveSupport::Concern

  def show
    profile = health_profile_for(student)
    authorize profile, :show?

    render json: { data: StudentHealthProfileBlueprint.render_as_hash(profile) }
  end

  def update
    profile = student.health_profile || student.build_health_profile(school_id: student.school_id)
    authorize profile, :update?

    unless profile.update(profile_params)
      return render_error(:validation_error, status: :unprocessable_content,
                                             details: profile.errors.to_hash)
    end

    render json: { data: StudentHealthProfileBlueprint.render_as_hash(profile) }
  end

  private

  def student
    @student ||= policy_scope(Student).find(params[:student_id])
  end

  def health_profile_for(student)
    student.health_profile || student.build_health_profile(school_id: student.school_id)
  end

  def profile_params
    params.require(:health_profile).permit(
      :blood_type, :health_plan_name, :health_plan_number,
      :emergency_contact_name, :emergency_contact_phone, :special_care_notes
    )
  end
end
