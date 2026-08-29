# frozen_string_literal: true

namespace :export do
  desc "Emit the people register of one school as portable SQL. " \
       "Usage: rake export:people_sql SCHOOL_ID=1 [TARGET_SCHOOL_ID=7] " \
       "[ONLY=guardians,teachers,job_positions] [OUT=tmp/people.sql]"
  #
  # Portable meaning: no primary keys travel. Production assigns its own ids and the rows find
  # each other by natural key — a collaborator by CPF, a post by name. Copying local ids would
  # collide with whatever already occupies them there, and would silently reparent rows to the
  # wrong school.
  #
  # Every statement is idempotent: run the file twice and the second run corrects rather than
  # duplicates, which is what makes it safe to fix the export and try again.
  task people_sql: :environment do
    school = School.kept.find(ENV.fetch("SCHOOL_ID"))
    out = ENV.fetch("OUT", "tmp/people.sql")
    only = ENV["ONLY"].to_s.split(",").map(&:strip).reject(&:blank?)
    only = %w[job_positions teachers guardians] if only.empty?

    quoted = ->(value) { ActiveRecord::Base.connection.quote(value) }

    # The school is resolved by CNPJ rather than by id. Production numbers its rows on its own,
    # and a literal id taken from here would silently hang 126 families off whichever school
    # happens to occupy that number there. `TARGET_SCHOOL_ID` overrides it for a school whose
    # CNPJ is not on file yet.
    if ENV["TARGET_SCHOOL_ID"].present?
      school_id = quoted.call(Integer(ENV["TARGET_SCHOOL_ID"]))
      target = "school #{ENV['TARGET_SCHOOL_ID']}"
    else
      abort("School #{school.id} has no CNPJ; pass TARGET_SCHOOL_ID=<id>.") if school.cnpj.blank?

      school_id = "(SELECT id FROM schools WHERE cnpj = #{quoted.call(school.cnpj)} " \
                  "AND discarded_at IS NULL)"
      target = "the school with CNPJ #{school.cnpj}"
    end

    lines = []
    lines << "-- Register of #{school.name} (local school #{school.id}) for #{target}."
    lines << "-- Sections: #{only.join(', ')}."
    lines << "-- Generated #{Time.current.iso8601}. Idempotent: matched on CPF and post name."
    lines << "BEGIN;"

    school.job_positions.kept.order(:name).each do |position|
      next unless only.include?("job_positions")

      lines << "INSERT INTO job_positions (school_id, name, created_at, updated_at) " \
               "VALUES (#{school_id}, #{quoted.call(position.name)}, NOW(), NOW()) " \
               "ON CONFLICT (school_id, name) WHERE discarded_at IS NULL DO NOTHING;"
    end

    school.teachers.kept.order(:name).each do |teacher|
      next unless only.include?("teachers")

      columns = %w[name cpf email phone hired_on zip_code street number complement neighborhood
                   city state]
      values = columns.map { |column| quoted.call(teacher[column]) }
      # The post is carried by name: its id in production is not its id here.
      position = "(SELECT id FROM job_positions WHERE school_id = #{school_id} " \
                 "AND name = #{quoted.call(teacher.job_position&.name)} " \
                 "AND discarded_at IS NULL LIMIT 1)"
      updates = (columns - %w[cpf]).map { |column| "#{column} = EXCLUDED.#{column}" }

      lines << "INSERT INTO teachers (school_id, job_position_id, #{columns.join(', ')}, " \
               "created_at, updated_at) VALUES (#{school_id}, #{position}, " \
               "#{values.join(', ')}, NOW(), NOW()) " \
               "ON CONFLICT (school_id, cpf) WHERE discarded_at IS NULL AND cpf IS NOT NULL " \
               "DO UPDATE SET #{updates.join(', ')}, updated_at = NOW();"
    end

    school.guardians.kept.order(:name).each do |guardian|
      next unless only.include?("guardians")

      columns = %w[name cpf email phone zip_code street number complement neighborhood city state]
      values = columns.map { |column| quoted.call(guardian[column]) }
      # Only what this side actually knows is written over: a blank here must not erase an
      # e-mail somebody typed into production afterwards.
      updates = (columns - %w[cpf]).map do |column|
        "#{column} = COALESCE(EXCLUDED.#{column}, guardians.#{column})"
      end

      lines << "INSERT INTO guardians (school_id, #{columns.join(', ')}, created_at, updated_at) " \
               "VALUES (#{school_id}, #{values.join(', ')}, NOW(), NOW()) " \
               "ON CONFLICT (school_id, cpf) WHERE discarded_at IS NULL AND cpf IS NOT NULL " \
               "DO UPDATE SET #{updates.join(', ')}, updated_at = NOW();"
    end

    lines << "COMMIT;"

    File.write(out, "#{lines.join("\n")}\n")

    puts "Wrote #{out}"
    puts "  job_positions: #{only.include?('job_positions') ? school.job_positions.kept.count : 0}"
    puts "  teachers:      #{only.include?('teachers') ? school.teachers.kept.count : 0}"
    puts "  guardians:     #{only.include?('guardians') ? school.guardians.kept.count : 0}"

    accounts = only.include?("teachers") ? TeacherBankAccount.where(school_id: school.id).count : 0

    if accounts.positive?
      puts "  ! #{accounts} bank account(s) NOT exported: pix keys and account numbers are " \
           "encrypted, and the ciphertext only reads back where the same key is configured."
    end
  end
end
