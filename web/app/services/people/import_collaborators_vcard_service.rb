# frozen_string_literal: true

module People
  # Puts a school's existing staff on file from the vCard export their phone or their old system
  # produced — the form the list actually arrives in, rather than a spreadsheet somebody would
  # have to retype it into first.
  #
  # Matched on CPF, so running it twice updates the same people instead of duplicating them: a
  # school correcting one address re-imports the file rather than hunting for the row.
  #
  # The address in these exports is not laid out the way RFC 6350 describes. The school's own
  # export puts the neighbourhood where the locality belongs and leaves the region empty, which
  # is why the mapping below reads `ADR` by position and takes the fourth component as the
  # neighbourhood. City and state are left blank rather than guessed from the postcode — an
  # address invented here would be believed.
  class ImportCollaboratorsVcardService < ApplicationService
    # The post is written differently in every export — "PROFESSOR" against a register holding
    # "Professor(a)". Comparing on a folded key keeps the import from creating a second post that
    # means the same thing.
    GENDER_SUFFIX = /\((?:a|o|as|os)\)\z/

    def initialize(school:, vcard_text:, dry_run: false)
      @school = school
      @vcard_text = vcard_text.to_s
      @dry_run = dry_run
    end

    def call
      cards = VcardParser.call(vcard_text)
      return ResponseService.failure(code: :no_cards_found) if cards.empty?

      created = []
      updated = []
      failed = []

      ActiveRecord::Base.transaction do
        cards.each { |card| upsert(card, created: created, updated: updated, failed: failed) }

        raise ActiveRecord::Rollback if dry_run
      end

      ResponseService.success(
        data: {
          created: created, updated: updated, failed: failed,
          positions_created: positions_created.uniq, dry_run: dry_run
        }
      )
    end

    private

    attr_reader :school, :vcard_text, :dry_run

    def positions_created
      @positions_created ||= []
    end

    def upsert(card, created:, updated:, failed:)
      cpf = Cpf.normalize(card[:cpf])
      if cpf.blank?
        failed << { name: card[:name], errors: { cpf: [ "missing" ] } }
        return nil
      end

      teacher = school.teachers.kept.find_by(cpf: cpf) || school.teachers.build(cpf: cpf)
      was_new = teacher.new_record?

      teacher.assign_attributes(attributes_for(card))

      if teacher.save
        (was_new ? created : updated) << { name: teacher.name, cpf: cpf }
        teacher
      else
        failed << { name: card[:name], cpf: cpf, errors: teacher.errors.to_hash }
        nil
      end
    end

    # Only what the card actually carries is written. A card with no e-mail must not blank out an
    # e-mail somebody typed in afterwards — the file is a list of people, not the whole truth
    # about each of them.
    def attributes_for(card)
      {
        name: card[:name],
        email: card[:email],
        phone: card[:phone],
        job_position: job_position_for(card[:title]),
        **card[:address]
      }.compact
    end

    def job_position_for(title)
      return nil if title.blank?

      key = fold(title)
      existing = school.job_positions.kept.find { |position| fold(position.name) == key }
      return existing if existing

      created = school.job_positions.create!(name: humanize_title(title))
      positions_created << created.name
      created
    end

    def fold(name)
      ActiveSupport::Inflector.transliterate(name.to_s)
                              .downcase.strip.sub(GENDER_SUFFIX, "").strip
    end

    # Exports shout: "COORD. PEDAGÓGICO" becomes "Coord. Pedagógico", which is what a select on
    # the collaborator form has to read like.
    def humanize_title(title)
      title.to_s.strip.split(/\s+/).map(&:capitalize).join(" ")
    end
  end
end
