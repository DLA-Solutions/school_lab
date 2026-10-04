# frozen_string_literal: true

module Incidents
  # Idempotent consumer hook for IncidentCreated (BR-IN09 / UC-IN04). Notifies whichever BR-IN08
  # approval slot(s) still need a holder, resolved from the *creating* membership's own role
  # template — never teachers, regardless of who created the incident:
  #
  # - Creator holds neither template (a teacher, or an untemplated `manage_academic` staff
  #   member) → both `coordination`- and `director`-templated staff are notified.
  # - Creator holds the `coordination` template → only `director`-templated staff are notified
  #   (not the creator, not other coordination staff, not teachers).
  # - Creator holds the `director` template → only `coordination`-templated staff are notified
  #   (symmetric to the above).
  #
  # This is informational only — it never fills an approval slot and never touches `status`
  # (that stays exclusively Incident#approve_coordination!/#approve_director! via
  # Academic::ApproveIncidentService).
  #
  # `channel_key: "incidents_staff_review"` is a deliberate extension of the BR-N02 taxonomy,
  # distinct from the guardian-facing `"incidents"` channel used by IncidentPublishedJob — same
  # kind of extension ReportCardPublishedJob made with `"report_cards"`.
  class IncidentCreatedJob < ApplicationJob
    queue_as :default

    def perform(incident_id, school_id)
      school = School.find_by(id: school_id)
      return unless school

      # No `school.incidents` association is declared on `School` (same gap noted in
      # IncidentPublishedJob) — scope explicitly instead.
      incident = Incident.find_by(id: incident_id, school_id: school.id)
      return unless incident

      Rails.logger.info(
        { event: "IncidentCreatedJob", incident_id: incident.id, school_id: school.id }.to_json
      )

      notify_pending_approvers(school, incident)
    end

    private

    def notify_pending_approvers(school, incident)
      user_ids = target_user_ids(school, incident.reported_by_membership)
      return if user_ids.empty?

      Notifications::ProcessIntentService.call(
        school: school,
        channel_key: "incidents_staff_review",
        source_type: "Incident",
        source_id: incident.id,
        target_user_ids: user_ids,
        payload: {
          "title" => I18n.t("notifications.push.incident_created.title"),
          "body" => I18n.t("notifications.push.incident_created.body", student: incident.student.name)
        }
      )
    end

    # BR-IN09: the creator's own role template (if any) is excluded from the target set — not
    # just the creator's own user id, but the whole template group, matching the PRD's "only
    # the other template's staff are notified" wording. `Incident::ROLE_TEMPLATE_APPROVAL_KEYS -
    # [creator_system_key]` is a no-op subtraction when the creator holds neither template (a
    # teacher, or an untemplated `manage_academic` staff member), which is exactly what leaves
    # both groups in the target set.
    def target_user_ids(school, creator_membership)
      creator_system_key = creator_membership&.staff_profile&.role_template&.system_key
      target_keys = Incident::ROLE_TEMPLATE_APPROVAL_KEYS - [ creator_system_key ].compact

      user_ids = target_keys.flat_map { |system_key| staff_user_ids_for(school, system_key) }
      user_ids.uniq - [ creator_membership&.user_id ].compact
    end

    # Active (not invited/suspended) memberships holding a staff_profile on the given system
    # role template. `school.system_role_template` already scopes to kept templates; `kept` on
    # `staff_profiles` drops discarded assignments the same way `affected_memberships_count` does.
    def staff_user_ids_for(school, system_key)
      template = school.system_role_template(system_key)
      return [] if template.blank?

      template.staff_profiles.kept.includes(:membership).filter_map do |profile|
        profile.membership&.user_id if profile.membership&.active?
      end
    end
  end
end
