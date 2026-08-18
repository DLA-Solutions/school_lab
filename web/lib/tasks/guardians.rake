# frozen_string_literal: true

namespace :guardians do
  desc "Put a school's families on file from a vCard export (idempotent, matched on CPF). " \
       "Usage: rake guardians:import_vcard SCHOOL_ID=1 VCARD=tmp/guardians.vcf [DRY_RUN=1]"
  task import_vcard: :environment do
    school = School.kept.find(ENV.fetch("SCHOOL_ID"))
    path = ENV.fetch("VCARD")
    dry_run = ENV["DRY_RUN"] == "1"

    result = People::ImportGuardiansVcardService.call(
      school: school,
      vcard_text: File.read(path),
      dry_run: dry_run
    )

    abort("Import failed: #{result.error_code} #{result.details}") if result.failure?

    data = result.data
    puts "School #{school.id} — #{dry_run ? 'dry run, nothing written' : 'written'}"
    puts "  created:    #{data[:created].size}"
    puts "  updated:    #{data[:updated].size}"
    puts "  failed:     #{data[:failed].size}"
    puts "  incomplete: #{data[:incomplete].size} (saved, but the school still has to chase these)"

    data[:failed].each { |row| puts "  ! #{row[:name]}: #{row[:errors]}" }
    data[:incomplete].each { |row| puts "  ~ #{row[:name]}: falta #{row[:missing].join(', ')}" }
  end
end
