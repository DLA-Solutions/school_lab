# frozen_string_literal: true

require "prawn"

module Academic
  # LUI-6: one PDF with the full context of every collaborator on the school's register -- active
  # and discarded alike -- so a backoffice/school user with `manage_people` can read registration
  # data, assignments, health profile, and bank account for the whole staff in one document instead
  # of opening each collaborator's dialogs one at a time.
  #
  # Deliberately queries `school.teachers` directly rather than `policy_scope(Teacher)`
  # (`TeacherPolicy::Scope` is kept-only): the export's whole point is to also show who was let
  # go, labeled "Desligado" by `discarded_at`. Do not "fix" this back to the kept-only scope.
  class RenderTeachersDossierPdfService < ApplicationService
    MARGIN = 56

    def initialize(school:)
      @school = school
    end

    def call
      ResponseService.success(data: { pdf: render, filename: filename })
    rescue Prawn::Errors::IncompatibleStringEncoding => e
      # Prawn's built-in fonts are Windows-1252, which covers Portuguese in full but not every
      # alphabet. A name or a free-text field (e.g. health notes) outside it must surface as a
      # clear refusal rather than a 500.
      Rails.logger.error(
        { event: "teachers_dossier.pdf_encoding_unsupported", school_id: school.id, message: e.message }.to_json
      )

      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.teachers_dossier_pdf_unsupported_characters") ] }
      )
    end

    private

    attr_reader :school

    def filename
      "colaboradores-#{school.name.to_s.parameterize}-#{Date.current.iso8601}.pdf"
    end

    def teachers
      @teachers ||= school.teachers
                           .includes(:job_position, :health_profile, :bank_account,
                                     teaching_assignments: %i[school_class subject])
                           .order(:name)
    end

    def render
      Prawn::Fonts::AFM.hide_m17n_warning = true

      Prawn::Document.new(page_size: "A4", page_layout: :portrait, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"

        cover(pdf)
        teachers.each do |teacher|
          pdf.start_new_page
          teacher_section(pdf, teacher)
        end
      end.render
    end

    def cover(pdf)
      pdf.text school.name.to_s, size: 14, style: :bold
      pdf.text I18n.t("reports.teachers_dossier.title"), size: 12
      pdf.text "#{I18n.t('reports.issued_on')} #{Date.current.strftime('%d/%m/%Y')}",
               size: 8, color: "666666"
      pdf.move_down 8
      pdf.text I18n.t("reports.row_count", count: teachers.size), size: 8, color: "666666"
    end

    def teacher_section(pdf, teacher)
      pdf.text teacher.name.to_s, size: 13, style: :bold
      pdf.text status_label(teacher), size: 9, color: "444444"
      pdf.move_down 10

      registration_data(pdf, teacher)
      assignments(pdf, teacher)
      health_profile_section(pdf, teacher)
      bank_account_section(pdf, teacher)
    end

    def status_label(teacher)
      teacher.discarded_at.present? ? I18n.t("reports.teachers_dossier.status_discarded") :
        I18n.t("reports.teachers_dossier.status_active")
    end

    def registration_data(pdf, teacher)
      section_title(pdf, I18n.t("reports.teachers_dossier.registration_data"))

      rows(pdf, [
        [ I18n.t("reports.teachers_dossier.cpf"), teacher.formatted_cpf ],
        [ I18n.t("reports.teachers_dossier.email"), teacher.email ],
        [ I18n.t("reports.teachers_dossier.phone"), teacher.phone ],
        [ I18n.t("reports.teachers_dossier.job_title"), teacher.job_title ],
        [ I18n.t("reports.teachers_dossier.hired_on"), format_date(teacher.hired_on) ],
        [ I18n.t("reports.teachers_dossier.address"), formatted_address(teacher) ]
      ])
    end

    def assignments(pdf, teacher)
      section_title(pdf, I18n.t("reports.teachers_dossier.assignments"))

      groups = teacher.teaching_assignments.kept.group_by(&:school_class)

      if groups.blank?
        blank_line(pdf)
      else
        groups.each do |school_class, assignments|
          subjects = assignments.map { |assignment| assignment.subject.name }.join(", ")
          pdf.text "#{school_class.name}: #{subjects}", size: 9, color: "444444"
        end
      end

      pdf.move_down 10
    end

    def health_profile_section(pdf, teacher)
      section_title(pdf, I18n.t("reports.teachers_dossier.health_profile"))

      profile = teacher.health_profile
      if profile.blank?
        blank_line(pdf)
      else
        rows(pdf, [
          [ I18n.t("reports.teachers_dossier.blood_type"), profile.blood_type ],
          [ I18n.t("reports.teachers_dossier.health_plan_name"), profile.health_plan_name ],
          [ I18n.t("reports.teachers_dossier.health_plan_number"), profile.health_plan_number ],
          [ I18n.t("reports.teachers_dossier.emergency_contact_name"), profile.emergency_contact_name ],
          [ I18n.t("reports.teachers_dossier.emergency_contact_phone"), profile.emergency_contact_phone ],
          [ I18n.t("reports.teachers_dossier.special_care_notes"), profile.special_care_notes ]
        ])
      end
    end

    def bank_account_section(pdf, teacher)
      section_title(pdf, I18n.t("reports.teachers_dossier.bank_account"))

      account = teacher.bank_account
      if account.blank? || !account.filled?
        blank_line(pdf)
      else
        rows(pdf, [
          [ I18n.t("reports.teachers_dossier.pix_key"), account.pix_key ],
          [ I18n.t("reports.teachers_dossier.bank_name"), account.bank_name ],
          [ I18n.t("reports.teachers_dossier.agency"), account.agency ],
          [ I18n.t("reports.teachers_dossier.account_number"), account.account_number ]
        ])
      end
    end

    def section_title(pdf, label)
      pdf.text label, size: 10, style: :bold
      pdf.move_down 4
    end

    def rows(pdf, pairs)
      pairs.each { |label, value| pdf.text "#{label}: #{value.presence || not_filled}", size: 9, color: "444444" }
      pdf.move_down 10
    end

    def blank_line(pdf)
      pdf.text not_filled, size: 9, color: "444444"
      pdf.move_down 10
    end

    def not_filled
      I18n.t("reports.teachers_dossier.not_filled")
    end

    def format_date(date)
      return not_filled if date.blank?

      date.strftime("%d/%m/%Y")
    end

    def formatted_address(teacher)
      parts = Teacher::ADDRESS_FIELDS.map { |field| teacher.public_send(field) }.map(&:presence).compact

      parts.any? ? parts.join(", ") : not_filled
    end
  end
end
