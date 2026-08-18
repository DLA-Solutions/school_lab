# frozen_string_literal: true

namespace :export do
  desc "Emit the people register of one school as portable SQL. " \
       "Usage: rake export:people_sql SCHOOL_ID=1 TARGET_SCHOOL_ID=7 [OUT=tmp/people.sql]"
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
    target = ENV.fetch("TARGET_SCHOOL_ID")
    out = ENV.fetch("OUT", "tmp/people.sql")

    quoted = ->(value) { ActiveRecord::Base.connection.quote(value) }
    school_id = quoted.call(Integer(target))

    lines = []
    lines << "-- Register of #{school.name} (local school #{school.id}) for school #{target}."
    lines << "-- Generated #{Time.current.iso8601}. Idempotent: matched on CPF and post name."
    lines << "BEGIN;"

    school.job_positions.kept.order(:name).each do |position|
      lines << "INSERT INTO job_positions (school_id, name, created_at, updated_at) " \
               "VALUES (#{school_id}, #{quoted.call(position.name)}, NOW(), NOW()) " \
               "ON CONFLICT (school_id, name) WHERE discarded_at IS NULL DO NOTHING;"
    end

    school.teachers.kept.order(:name).each do |teacher|
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
    puts "  job_positions: #{school.job_positions.kept.count}"
    puts "  teachers:      #{school.teachers.kept.count}"
    puts "  guardians:     #{school.guardians.kept.count}"

    accounts = TeacherBankAccount.where(school_id: school.id).count
    return if accounts.zero?

    puts "  ! #{accounts} bank account(s) NOT exported: pix keys and account numbers are " \
         "encrypted, and the ciphertext only reads back where the same key is configured."
  end
end
