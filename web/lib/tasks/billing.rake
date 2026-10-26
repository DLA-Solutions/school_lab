# frozen_string_literal: true

namespace :billing do
  desc "Enqueue the presentation sync for issued Banco Inter boletos still missing their linha " \
       "digitavel or Pix (issued before the post-issuance follow-up existed)"
  task backfill_issuance_presentation: :environment do
    missing = ChargeIssuance.where(digitable_line: [ nil, "" ]).or(ChargeIssuance.where(pix_emv: [ nil, "" ]))
    count = 0

    missing.issued.where(provider: "inter").where.not(provider_invoice_id: nil).find_each do |issuance|
      Billing::SyncIssuancePresentationJob.perform_later(issuance.id, issuance.school_id)
      count += 1
    end

    puts "Enqueued #{count} issuance presentation sync job(s)"
  end
end
