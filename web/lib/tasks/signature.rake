# frozen_string_literal: true

namespace :signature do
  # Registers a school's Autentique API token so contracts can be sent for signature.
  #
  #   AUTENTIQUE_API_TOKEN=... bin/rails signature:register[3]
  #
  # The token is read from the environment rather than taken as an argument: an argument ends up
  # in the shell history and in the process list, and this one is a live credential that can
  # create documents in the school's name. It is stored encrypted (`SchoolSignatureProvider`
  # declares `encrypts :api_token`) and never read back out by the API.
  #
  # Re-running it replaces the token on the school's active row, which is how a rotation is done.
  desc "Register a school's Autentique API token (AUTENTIQUE_API_TOKEN=... rake signature:register[school_id])"
  task :register, [ :school_id ] => :environment do |_task, args|
    token = ENV.fetch("AUTENTIQUE_API_TOKEN", nil)
    abort "Set AUTENTIQUE_API_TOKEN in the environment." if token.blank?

    school_id = args[:school_id]
    abort "Usage: AUTENTIQUE_API_TOKEN=... bin/rails signature:register[school_id]" if school_id.blank?

    school = School.kept.find(school_id)

    config = SchoolSignatureProvider.find_or_initialize_by(school: school, provider: "autentique")
    config.assign_attributes(api_token: token, active: true, uploaded_at: Time.current)

    # Autentique signs each callback with HMAC-SHA256 over the raw body, and the verifier refuses
    # everything when there is no secret to compare against — so a school registered without one
    # answers 401 to every delivery and never learns that a family signed. Generated here, and
    # printed once so it can be pasted into the webhook's settings.
    config.webhook_secret = ENV["AUTENTIQUE_WEBHOOK_SECRET"].presence ||
                            config.webhook_secret.presence ||
                            SecureRandom.hex(32)

    # One active provider per school is a partial unique index; anything else the school had
    # registered stands down rather than colliding.
    SchoolSignatureProvider.where(school: school).where.not(id: config.id).update_all(active: false)

    config.save!

    puts "Autentique registered for #{school.name} (school #{school.id})."
    puts "Webhook URL:    /webhooks/signatures/#{config.webhook_endpoint_token}"
    puts "Webhook secret: #{config.webhook_secret}"
    puts "Register both in Autentique (Configurações → Webhooks), format JSON."
  end

  desc "Show which signature provider each school is configured with (no credentials printed)"
  task status: :environment do
    SchoolSignatureProvider.includes(:school).find_each do |config|
      state = config.active ? "active" : "inactive"
      secret = config.webhook_secret.present? ? "webhook secret set" : "NO WEBHOOK SECRET — callbacks will 401"
      puts "school #{config.school_id} (#{config.school&.name}): #{config.provider} — #{state} — #{secret}"
    end
  end

  # The same sweep the scheduler runs, for when a contract has to be caught up right now.
  desc "Ask the provider what became of every contract still awaiting signature"
  task reconcile: :environment do
    Signatures::ReconcilePendingContractsJob.perform_now
    puts "Done. See the signature.sweep.completed log line for what changed."
  end
end
