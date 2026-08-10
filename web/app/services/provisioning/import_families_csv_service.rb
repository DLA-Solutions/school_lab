# frozen_string_literal: true

require "set"

module Provisioning
  # Validates and optionally commits student/guardian rows from a provisioning CSV upload.
  class ImportFamiliesCsvService < ApplicationService
    MAX_FILE_BYTES = 5.megabytes

    def initialize(school:, actor:, file_io:, dry_run: true)
      @school = school
      @actor = actor
      @file_io = file_io
      @dry_run = ActiveModel::Type::Boolean.new.cast(dry_run)
    end

    def call
      return missing_file_failure if file_io.blank?

      csv_bytes = read_limited_file
      return csv_bytes if csv_bytes.is_a?(ResponseService)

      parse_result = CsvRowParser.new(StringIO.new(csv_bytes)).call
      return persist_failed_import(parse_result) if parse_result.failure?

      rows = parse_result.data
      validation = validate_rows(rows)
      return persist_failed_import(validation) if validation.failure?

      summary = validation.data.fetch(:summary)
      if dry_run
        import = create_import_record!(
          status: "previewed",
          row_count: rows.size,
          error_report: nil
        )
        return ResponseService.success(data: { import: import, summary: summary })
      end

      commit_result = commit_rows(rows, summary: summary)
      return persist_failed_import(commit_result) if commit_result.failure?

      import = create_import_record!(
        status: "committed",
        row_count: rows.size,
        error_report: nil,
        committed_at: Time.current
      )
      ResponseService.success(data: { import: import, summary: commit_result.data.fetch(:summary) })
    end

    private

    attr_reader :school, :actor, :file_io, :dry_run

    def missing_file_failure
      ResponseService.failure(
        code: :import_validation_failed,
        details: {
          error_report: {
            file: [ I18n.t("api.errors.provisioning_import_missing_file") ]
          }
        }
      )
    end

    def read_limited_file
      bytes = file_io.read(MAX_FILE_BYTES + 1)
      if bytes.bytesize > MAX_FILE_BYTES
        return ResponseService.failure(
          code: :import_validation_failed,
          details: {
            error_report: {
              file: [ I18n.t("api.errors.provisioning_import_file_too_large") ]
            }
          }
        )
      end

      bytes.to_s
    end

    def validate_rows(rows)
      school_classes = index_school_classes
      row_errors = []
      summary = {
        valid_rows: 0,
        students_to_create: 0,
        guardians_to_create: 0,
        links_to_create: 0
      }
      seen_guardian_cpfs = {}
      seen_guardian_emails = {}
      planned_students = {}
      planned_guardians = {}
      planned_links = Set.new
      planned_parent_links = Set.new

      rows.each do |row|
        errors = row_errors_for(row, school_classes: school_classes)
        track_duplicate_keys(
          row,
          errors: errors,
          seen_guardian_cpfs: seen_guardian_cpfs,
          seen_guardian_emails: seen_guardian_emails
        )
        if errors.empty?
          student_key = student_identity_key(row, school_classes)
          relationship = row.attributes["guardian_relationship"]&.downcase
          parent_key = [ student_key, relationship ]
          if relationship.in?(%w[father mother]) && planned_parent_links.include?(parent_key)
            errors["guardian_relationship"] = [ I18n.t("errors.messages.taken") ]
          else
            planned_parent_links << parent_key
          end
        end
        if errors.any?
          row_errors << { row: row.number, errors: errors }
          next
        end

        summary[:valid_rows] += 1
        student_key = student_identity_key(row, school_classes)
        guardian_key = guardian_identity_key(row)
        link_key = [ student_key, guardian_key ]

        summary[:students_to_create] += 1 if planned_students[student_key].nil? && !existing_student?(row, school_classes)
        planned_students[student_key] = true

        summary[:guardians_to_create] += 1 if planned_guardians[guardian_key].nil? && !existing_guardian?(row)
        planned_guardians[guardian_key] = true

        unless planned_links.include?(link_key) || existing_link?(row, school_classes)
          summary[:links_to_create] += 1
          planned_links << link_key
        end
      end

      if row_errors.any?
        return ResponseService.failure(
          code: :import_validation_failed,
          details: { error_report: { rows: row_errors } }
        )
      end

      ResponseService.success(data: { summary: summary })
    end

    def row_errors_for(row, school_classes:)
      attributes = row.attributes
      errors = {}

      REQUIRED_FIELDS.each do |field|
        errors[field] = [ I18n.t("errors.messages.blank") ] if attributes[field].blank?
      end

      birth_date = parse_birth_date(attributes["student_birth_date"])
      if attributes["student_birth_date"].present? && birth_date.nil?
        errors["student_birth_date"] = [ I18n.t("api.errors.provisioning_import_invalid_date") ]
      end

      relationship = attributes["guardian_relationship"]&.downcase
      unless StudentGuardian::RELATIONSHIPS.include?(relationship)
        errors["guardian_relationship"] = [ I18n.t("errors.messages.inclusion") ]
      end

      if attributes["school_class_name"].present? &&
         school_classes[normalize_name(attributes["school_class_name"])].nil?
        errors["school_class_name"] = [ I18n.t("api.errors.provisioning_import_class_not_found") ]
      end

      school_class = school_classes[normalize_name(attributes["school_class_name"])]

      student = find_existing_student(row, school_class) || build_student(row, school_class: school_class)
      unless student.persisted?
        student.valid?
        merge_model_errors(errors, student.errors.to_hash, prefix: "student")
      end

      guardian = find_existing_guardian(row) || build_guardian(row)
      unless guardian.persisted?
        guardian.valid?
        merge_model_errors(errors, guardian.errors.to_hash, prefix: "guardian")
      end

      if student.persisted? && guardian.persisted? &&
         school.student_guardians.kept.exists?(student: student, guardian: guardian)
        return errors
      end

      link = build_link(row, student: student, guardian: guardian, relationship: relationship)
      link.valid?
      merge_model_errors(errors, link.errors.to_hash, prefix: "link")

      errors
    end

    def track_duplicate_keys(row, errors:, seen_guardian_cpfs:, seen_guardian_emails:)
      guardian_cpf = normalized_cpf(row.attributes["guardian_cpf"])
      if guardian_cpf.present?
        if seen_guardian_cpfs[guardian_cpf]
          errors["guardian_cpf"] = [ I18n.t("api.errors.provisioning_import_duplicate_cpf_in_file") ]
        else
          seen_guardian_cpfs[guardian_cpf] = row.number
        end
      end

      email = row.attributes["guardian_email"]&.downcase
      return if email.blank?

      if seen_guardian_emails[email]
        errors["guardian_email"] = [ I18n.t("api.errors.provisioning_import_duplicate_email_in_file") ]
      else
        seen_guardian_emails[email] = row.number
      end
    end

    def commit_rows(rows, summary:)
      school_classes = index_school_classes

      ActiveRecord::Base.transaction do
        rows.each do |row|
          school_class = school_classes.fetch(normalize_name(row.attributes["school_class_name"]))
          student = find_or_create_student!(row, school_class)
          guardian = find_or_create_guardian!(row)
          relationship = row.attributes["guardian_relationship"].downcase

          next if school.student_guardians.kept.exists?(student: student, guardian: guardian)

          link = school.student_guardians.create!(
            student: student,
            guardian: guardian,
            relationship: relationship
          )
          raise ActiveRecord::Rollback unless link.persisted?

          People::SyncGuardianActivationService.call(student: student)
        end
      end

      ResponseService.success(data: { summary: summary })
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(
        code: :import_validation_failed,
        details: {
          error_report: {
            file: [ e.record.errors.full_messages.join(", ") ]
          }
        }
      )
    end

    def find_or_create_student!(row, school_class)
      existing = find_existing_student(row, school_class)
      return existing if existing

      student = build_student(row, school_class: school_class)
      student.save!
      student
    end

    def find_or_create_guardian!(row)
      existing = find_existing_guardian(row)
      return existing if existing

      guardian = build_guardian(row)
      guardian.save!
      guardian
    end

    def build_student(row, school_class:)
      attributes = row.attributes
      student = school.students.build(
        name: attributes["student_name"],
        birth_date: parse_birth_date(attributes["student_birth_date"]),
        rg: attributes["student_rg"],
        cpf: normalized_cpf(attributes["student_cpf"]),
        status: "active",
        school_class: school_class
      )
      student.provisioning_import = true
      student
    end

    def build_guardian(row)
      attributes = row.attributes
      guardian = school.guardians.build(
        name: attributes["guardian_name"],
        email: attributes["guardian_email"],
        phone: attributes["guardian_phone"],
        cpf: normalized_cpf(attributes["guardian_cpf"]),
        zip_code: attributes["guardian_zip_code"],
        street: attributes["guardian_street"],
        number: attributes["guardian_number"],
        complement: attributes["guardian_complement"],
        neighborhood: attributes["guardian_neighborhood"],
        city: attributes["guardian_city"],
        state: attributes["guardian_state"]
      )
      guardian.provisioning_import = true
      guardian
    end

    def build_link(row, student:, guardian:, relationship:)
      school.student_guardians.build(
        student: student,
        guardian: guardian,
        relationship: relationship
      )
    end

    def existing_student?(row, school_classes)
      find_existing_student(row, school_classes[normalize_name(row.attributes["school_class_name"])]).present?
    end

    def existing_guardian?(row)
      find_existing_guardian(row).present?
    end

    def existing_link?(row, school_classes)
      student = find_existing_student(row, school_classes[normalize_name(row.attributes["school_class_name"])])
      guardian = find_existing_guardian(row)
      return false unless student && guardian

      school.student_guardians.kept.exists?(student: student, guardian: guardian)
    end

    def find_existing_student(row, school_class)
      cpf = normalized_cpf(row.attributes["student_cpf"])
      if cpf.present?
        return school.students.kept.find_by(cpf: cpf)
      end

      birth_date = parse_birth_date(row.attributes["student_birth_date"])
      return if birth_date.blank? || school_class.blank?

      school.students.kept.find_by(
        name: row.attributes["student_name"],
        birth_date: birth_date,
        school_class_id: school_class.id
      )
    end

    def find_existing_guardian(row)
      cpf = normalized_cpf(row.attributes["guardian_cpf"])
      if cpf.present?
        return school.guardians.kept.find_by(cpf: cpf) || school.guardians.discarded.find_by(cpf: cpf)
      end

      email = row.attributes["guardian_email"]&.downcase
      school.guardians.kept.find_by("LOWER(email) = ?", email)
    end

    def student_identity_key(row, school_classes)
      cpf = normalized_cpf(row.attributes["student_cpf"])
      return "student:cpf:#{cpf}" if cpf.present?

      [
        "student",
        normalize_name(row.attributes["student_name"]),
        row.attributes["student_birth_date"],
        school_classes[normalize_name(row.attributes["school_class_name"])]&.id
      ].join(":")
    end

    def guardian_identity_key(row)
      cpf = normalized_cpf(row.attributes["guardian_cpf"])
      return "guardian:cpf:#{cpf}" if cpf.present?

      "guardian:email:#{row.attributes['guardian_email']&.downcase}"
    end

    def index_school_classes
      @index_school_classes ||= school.school_classes.index_by { |record| normalize_name(record.name) }
    end

    def normalize_name(value)
      value.to_s.strip.downcase
    end

    def normalized_cpf(value)
      Cpf.normalize(value)
    end

    def parse_birth_date(value)
      return if value.blank?

      Date.iso8601(value)
    rescue ArgumentError
      nil
    end

    def merge_model_errors(errors, model_errors, prefix:)
      model_errors.each do |attribute, messages|
        key = attribute.to_s
        key = "#{prefix}_#{key}" unless key.start_with?("#{prefix}_")
        errors[key] = messages
      end
    end

    def persist_failed_import(result)
      error_report = result.details&.dig(:error_report) || result.details
      create_import_record!(
        status: "failed",
        row_count: nil,
        error_report: error_report
      )
      result
    end

    def create_import_record!(status:, row_count:, error_report:, committed_at: nil)
      school.provisioning_imports.create!(
        uploaded_by: actor,
        status: status,
        row_count: row_count,
        error_report: error_report,
        committed_at: committed_at
      )
    end

    REQUIRED_FIELDS = CsvRowParser::REQUIRED_HEADERS
  end
end
