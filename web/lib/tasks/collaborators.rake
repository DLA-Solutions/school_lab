# frozen_string_literal: true

namespace :collaborators do
  desc "Put a school's staff on file from a vCard export (idempotent, matched on CPF). " \
       "Usage: rake collaborators:import_vcard SCHOOL_ID=1 VCARD=tmp/collaborators.vcf [DRY_RUN=1]"
  task import_vcard: :environment do
    school = School.kept.find(ENV.fetch("SCHOOL_ID"))
    path = ENV.fetch("VCARD")
    dry_run = ENV["DRY_RUN"] == "1"

    result = People::ImportCollaboratorsVcardService.call(
      school: school,
      vcard_text: File.read(path),
      dry_run: dry_run
    )

    abort("Import failed: #{result.error_code} #{result.details}") if result.failure?

    data = result.data
    puts "School #{school.id} — #{dry_run ? 'dry run, nothing written' : 'written'}"
    puts "  created:   #{data[:created].size}"
    puts "  updated:   #{data[:updated].size}"
    puts "  failed:    #{data[:failed].size}"
    # Named so the school can merge a post the import had to invent — "Professor" against a
    # register that already said "Professor(a)" is the one thing this cannot decide for them.
    puts "  new posts: #{data[:positions_created].join(', ')}" if data[:positions_created].any?

    data[:failed].each do |row|
      puts "  ! #{row[:name]}: #{row[:errors]}"
    end
  end
end
