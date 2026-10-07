# frozen_string_literal: true

module DemoSchool
  module_function

  # One secretary thread for Pedro, opened by the loggable guardian, so staff inboxes are not empty.
  # SendMessageService writes the bell rows (BR-M07) and does not send email.
  def seed_family_chat!(school)
    student = Student.kept.find_by!(school: school, cpf: DEMO_STUDENT_CPF)
    user = User.kept.find_by!(email: GUARDIAN_EMAIL)
    membership = Membership.kept.find_by!(user: user, school: school)

    conversation = Conversation.find_by(
      school_id: school.id,
      student_id: student.id,
      audience: "secretary",
      teacher_id: nil
    )
    return if conversation&.messages&.exists?(sender_membership_id: membership.id)

    result = Communication::SendMessageService.call(
      school: school,
      actor_membership: membership,
      student_id: student.id,
      audience: "secretary",
      body: "Olá, secretaria. Pode buscar o Pedro mais cedo hoje?"
    )
    return if result.success?

    raise "Demo family chat seed failed: #{result.error_code} #{result.details.inspect}"
  end
end
