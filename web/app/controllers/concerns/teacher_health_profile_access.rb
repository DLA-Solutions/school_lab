# frozen_string_literal: true

# Reading and writing a collaborator's structured health profile (BC6). Shared by the teacher's
# own self-service endpoint and the staff-facing read-only endpoint on the Colaboradores roster.
# Unlike StudentHealthProfileAccess, this concern does NOT resolve `teacher` itself — the two
# includers resolve "the teacher" differently (self via email match vs `:teacher_id` param), so
# each controller defines its own private `teacher` method.
module TeacherHealthProfileAccess
  extend ActiveSupport::Concern

  def show
    profile = health_profile_for(teacher)
    authorize profile, :show?

    render json: { data: TeacherHealthProfileBlueprint.render_as_hash(profile) }
  end

  def update
    profile = health_profile_for(teacher)
    authorize profile, :update?

    unless profile.update(profile_params)
      return render_error(:validation_error, status: :unprocessable_content,
                                              details: profile.errors.to_hash)
    end

    render json: { data: TeacherHealthProfileBlueprint.render_as_hash(profile) }
  end

  private

  def health_profile_for(teacher)
    teacher.health_profile || teacher.build_health_profile(school_id: teacher.school_id)
  end

  def profile_params
    params.require(:health_profile).permit(
      :blood_type, :health_plan_name, :health_plan_number,
      :emergency_contact_name, :emergency_contact_phone, :special_care_notes
    )
  end
end
