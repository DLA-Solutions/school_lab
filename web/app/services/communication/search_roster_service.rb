# frozen_string_literal: true

module Communication
  # Name-based, cross-class roster lookup for staff starting a new conversation: a type-ahead
  # over every class an actor may see, matched by the student's own name or any of their kept
  # guardians' names. Additive to ListRosterService (by-class browsing) — same row shape, same
  # role visibility rules widened from "one class" to "every class this actor may see", same
  # conversation-attachment behavior. ListRosterService stays untouched; the actor-classification
  # and destination-building helpers below are intentionally duplicated rather than shared, which
  # matches how this codebase already repeats that logic in SendMessageService and
  # ConversationPolicy::Access rather than extracting a shared concern.
  class SearchRosterService < ApplicationService
    # A type-ahead, not a paginated list: capped and ordered by name so the first screenful is
    # useful without a Pagy envelope.
    MAX_RESULTS = 20
    MIN_QUERY_LENGTH = 2

    Row = Struct.new(
      :student_id,
      :student_name,
      :school_class_id,
      :conversation_id,
      :sender_line,
      :teacher_id,
      :destinations,
      :guardians,
      keyword_init: true
    )

    Destination = Struct.new(:audience, :teacher_id, :name, keyword_init: true)
    GuardianRow = Struct.new(:name, :relationship, keyword_init: true)

    # Fixed display order for a student's guardians on a search hit, father/mother before "other".
    RELATIONSHIP_ORDER = { "father" => 0, "mother" => 1, "other" => 2 }.freeze

    def initialize(school:, actor_membership:, query:)
      @school = school
      @actor_membership = actor_membership
      @query = query.to_s.strip
    end

    def call
      ResponseService.success(data: roster_rows)
    end

    private

    attr_reader :school, :actor_membership, :query

    def roster_rows
      return [] if query.length < MIN_QUERY_LENGTH

      loaded_students.map { |student| row_for(student) }
    end

    def row_for(student)
      conversation = attached_conversation_for(student)
      spoken = conversation&.last_speaker_message

      Row.new(
        student_id: student.id,
        student_name: student.name,
        school_class_id: student.school_class_id,
        conversation_id: spoken ? conversation.id : nil,
        sender_line: spoken ? conversation.sender_line : nil,
        teacher_id: acting_teacher_id,
        destinations: director? ? director_destinations_for(student) : nil,
        guardians: guardian_rows_for(student)
      )
    end

    def loaded_students
      return @loaded_students if defined?(@loaded_students)

      @loaded_students = matching_students
        .preload(:school_class, student_guardians: :guardian)
        .order(:name, :id)
        .limit(MAX_RESULTS)
        .to_a
    end

    # Student name OR a kept guardian's name, scoped to whatever classes this actor may see.
    # Two `where(id: ...)` subqueries on the same base relation (rather than a join) so matching
    # by guardian name never duplicates a student row.
    def matching_students
      scoped = base_students

      scoped.where(id: scoped.search(query).select(:id))
            .or(scoped.where(id: guardian_matched_student_ids))
    end

    def guardian_matched_student_ids
      StudentGuardian.kept
        .where(school_id: school.id)
        .joins(:guardian)
        .merge(Guardian.kept.search(query))
        .select(:student_id)
    end

    def base_students
      case actor_kind
      when :teacher
        return school.students.kept.none if actor_teacher.blank?

        school.students.kept.where(school_class_id: visible_class_ids)
      when :secretary, :coordination, :director
        school.students.kept
      else
        school.students.kept.none
      end
    end

    # Every class this teacher currently teaches — not just one — matching
    # ListRosterService#teacher_assigned_to_class? widened from a single class to the full set.
    def visible_class_ids
      TeachingAssignment.kept
        .where(school_id: school.id, teacher_id: actor_teacher.id)
        .select(:school_class_id)
    end

    def guardian_rows_for(student)
      student.student_guardians
        .select { |link| link.kept? && link.guardian&.kept? }
        .sort_by { |link| RELATIONSHIP_ORDER.fetch(link.relationship, 99) }
        .map { |link| GuardianRow.new(name: link.guardian.name, relationship: link.relationship) }
    end

    def attached_conversation_for(student)
      return if director?

      conversations_by_student_id[student.id]
    end

    def conversations_by_student_id
      return @conversations_by_student_id if defined?(@conversations_by_student_id)

      rows = matching_conversations.to_a
      students_by_id = loaded_students.index_by(&:id)
      rows.each do |conversation|
        student = students_by_id[conversation.student_id]
        conversation.association(:student).target = student if student
      end
      Conversation.preload_last_speakers(rows)
      @conversations_by_student_id = rows.index_by(&:student_id)
    end

    def matching_conversations
      base = Conversation.where(school_id: school.id, student_id: loaded_students.map(&:id))

      case actor_kind
      when :teacher
        base.where(audience: "teacher", teacher_id: actor_teacher.id)
      when :secretary
        base.where(audience: "secretary", teacher_id: nil)
      when :coordination
        base.where(audience: "coordination", teacher_id: nil)
      else
        base.none
      end
    end

    # Destinations for a director are per-hit, because unlike the by-class roster, two hits in the
    # same search can belong to different classes. Batched across every class in this result page
    # (at most MAX_RESULTS distinct classes) instead of one query per row.
    def director_destinations_for(student)
      teachers = class_teachers_by_school_class_id.fetch(student.school_class_id, [])

      [
        destination("coordination"),
        destination("secretary"),
        *teachers.map { |teacher| destination("teacher", teacher: teacher) }
      ]
    end

    def class_teachers_by_school_class_id
      return @class_teachers_by_school_class_id if defined?(@class_teachers_by_school_class_id)

      class_ids = loaded_students.map(&:school_class_id).uniq
      assignments = TeachingAssignment.kept
        .where(school_id: school.id, school_class_id: class_ids)
        .select(:school_class_id, :teacher_id)
        .to_a

      teachers_by_id = school.teachers.kept.where(id: assignments.map(&:teacher_id).uniq).index_by(&:id)

      @class_teachers_by_school_class_id = assignments.group_by(&:school_class_id).transform_values do |rows|
        rows.filter_map { |row| teachers_by_id[row.teacher_id] }.uniq(&:id).sort_by(&:id)
      end
    end

    # The acting teacher needs their own id before any conversation exists.
    # Secretary and coordination rows stay null; director rows omit the key.
    def acting_teacher_id
      actor_teacher.id if actor_kind == :teacher
    end

    def destination(audience, teacher: nil)
      Destination.new(audience: audience, teacher_id: teacher&.id, name: teacher&.name)
    end

    # Leadership is matched before the teacher email, matching SendMessageService#actor_kind:
    # a coordinator who also has a teacher record still sees every class.
    def actor_kind
      return :other if actor_membership.blank?
      return :director if director?
      return :coordination if coordination?
      return :secretary if secretary?
      return :teacher if actor_membership.role == "teacher"

      :other
    end

    def director?
      actor_system_key == "director"
    end

    def coordination?
      actor_system_key == "coordination"
    end

    def secretary?
      actor_system_key == "secretary"
    end

    def actor_system_key
      return @actor_system_key if defined?(@actor_system_key)

      profile = if actor_membership.blank?
        nil
      else
        StaffProfile.kept.find_by(membership_id: actor_membership.id, school_id: school.id)
      end
      template = profile&.role_template
      @actor_system_key = template&.kept? ? template.system_key : nil
    end

    def actor_teacher
      return @actor_teacher if defined?(@actor_teacher)

      email = actor_membership&.user&.email
      @actor_teacher = if email.blank?
        nil
      else
        school.teachers.kept.find_by(email: email)
      end
    end
  end
end
