# frozen_string_literal: true

module DemoSchool
  module_function

  def seed_staff_users!(school)
    seed_backoffice_user!
    seed_school_staff!(school)
  end

  def seed_backoffice_user!
    user = find_or_create_confirmed_user!(BACKOFFICE_EMAIL)
    membership = Membership.find_or_initialize_by(user: user, school: nil)
    membership.assign_attributes(role: "backoffice", status: "active", platform_permissions: [ "provision_school" ])
    membership.save!
    user
  end

  def seed_school_staff!(school)
    admin_user = find_or_create_confirmed_user!(ADMIN_EMAIL)
    admin_membership = find_or_create_membership!(user: admin_user, school: school, role: "staff")
    ensure_staff_profile!(
      membership: admin_membership,
      school: school,
      system_key: "director",
      is_owner: true,
      display_title: "Diretor"
    )

    secretary_user = find_or_create_confirmed_user!(SECRETARY_EMAIL)
    secretary_membership = find_or_create_membership!(user: secretary_user, school: school, role: "staff")
    ensure_staff_profile!(
      membership: secretary_membership,
      school: school,
      system_key: "secretary",
      display_title: "Secretária"
    )

    coordinator_user = find_or_create_confirmed_user!(COORDINATOR_EMAIL)
    coordinator_membership = find_or_create_membership!(user: coordinator_user, school: school, role: "staff")
    segment = Segment.find_or_create_by!(school: school, name: "Fundamental I")
    ensure_staff_profile!(
      membership: coordinator_membership,
      school: school,
      system_key: "coordination",
      display_title: "Coordenadora",
      segment: segment,
      also_teaches: true
    )

    teacher_user = find_or_create_confirmed_user!(TEACHER_EMAIL)
    teacher_membership = find_or_create_membership!(user: teacher_user, school: school, role: "teacher")
    ensure_staff_profile!(
      membership: teacher_membership,
      school: school,
      system_key: "teacher",
      display_title: "Professora"
    )

    {
      admin: admin_user,
      secretary: secretary_user,
      coordinator: coordinator_user,
      teacher: teacher_user
    }
  end

  def ensure_staff_profile!(membership:, school:, system_key:, display_title:, is_owner: false, segment: nil,
                            also_teaches: false)
    template = school.system_role_template(system_key)
    raise "Demo seed missing #{system_key} role template" if template.blank?

    profile = StaffProfile.find_or_initialize_by(membership: membership, school: school)
    profile.assign_attributes(
      role_template: template,
      is_owner: is_owner,
      display_title: profile.display_title.presence || display_title,
      segment: segment,
      also_teaches: also_teaches
    )
    profile.save!
    profile
  end
end
