# frozen_string_literal: true

# Headless policy (no AR record, no Scope) for the teacher live boletim preview (BR-RC14). This
# is an on-demand cross-subject computation, not a lookup against one resource, so there is
# nothing to scope -- `authorize :report_card_preview, :show?` just checks the requester's role.
#
# Deliberately separate from ReportCardSnapshotPolicy, which still denies the `teacher` role on
# published snapshots. Per the PRD's permission table this capability is teacher-only: any teacher
# at the school may preview any student, but `manage_academic` staff do not get it through here
# (they already have snapshot access once published).
class ReportCardPreviewPolicy < ApplicationPolicy
  def show?
    teacher_member?
  end

  private

  def teacher_member?
    membership = Current.membership
    membership&.active? && membership.role == "teacher"
  end
end
