# frozen_string_literal: true

module People
  # Puts a school's existing families on file from the vCard export their old system produced.
  #
  # Matched on CPF, so running it twice updates the same people instead of duplicating them, and
  # a card carrying nothing new leaves the record alone.
  #
  # The list arrives with holes — a guardian with no e-mail, a household whose address was never
  # written down past the street — so the records are saved as partial imports. The form the
  # secretary fills in still asks for all of it; refusing the list wholesale would only mean the
  # school keeps its families in the old system.
  #
  # `TITLE` is dropped. The register has nowhere to put a profession, and in these exports the
  # field mostly holds codes from the old system ("SP", "SI", "NÃO INFORMADO") rather than a
  # profession anybody would want on file.
  class ImportGuardiansVcardService < ApplicationService
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
      incomplete = []

      ActiveRecord::Base.transaction do
        cards.each do |card|
          upsert(card, created: created, updated: updated, failed: failed, incomplete: incomplete)
        end

        raise ActiveRecord::Rollback if dry_run
      end

      ResponseService.success(
        data: {
          created: created, updated: updated, failed: failed,
          incomplete: incomplete, dry_run: dry_run
        }
      )
    end

    private

    attr_reader :school, :vcard_text, :dry_run

    def upsert(card, created:, updated:, failed:, incomplete:)
      cpf = Cpf.normalize(card[:cpf])
      if cpf.blank?
        failed << { name: card[:name], errors: { cpf: [ "missing" ] } }
        return
      end

      guardian = school.guardians.kept.find_by(cpf: cpf) || school.guardians.build(cpf: cpf)
      was_new = guardian.new_record?

      guardian.partial_import = true
      # Only what the card carries is written: a card with no e-mail must not blank out one
      # somebody typed in afterwards.
      guardian.assign_attributes({ name: card[:name], email: card[:email], phone: card[:phone],
                                   **card[:address] }.compact)

      if guardian.save
        (was_new ? created : updated) << { name: guardian.name, cpf: cpf }
        note_gaps(guardian, card, incomplete)
      else
        failed << { name: card[:name], cpf: cpf, errors: guardian.errors.to_hash }
      end
    end

    # What the school still has to chase. A record saved with holes is worth having; a hole
    # nobody is told about is not.
    def note_gaps(guardian, card, incomplete)
      missing = []
      missing << "e-mail" if guardian.email.blank?
      missing << "telefone" if guardian.phone.blank?
      missing << "endereço" if guardian.street.blank?
      missing << "CEP" if guardian.zip_code.blank?
      # Nothing in these exports carries the number, the city or the state, so they are named
      # once here rather than repeated against every row.
      missing << "e-mail inválido (#{card[:discarded_email]})" if card[:discarded_email].present?

      incomplete << { name: guardian.name, cpf: guardian.cpf, missing: missing } if missing.any?
    end
  end
end
