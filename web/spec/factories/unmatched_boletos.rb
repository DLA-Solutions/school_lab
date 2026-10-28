FactoryBot.define do
  factory :unmatched_boleto do
    school
    provider { "inter" }
    sequence(:provider_invoice_id) { |n| "inter-invoice-#{n}" }

    # A real, checksummed CPF that does not belong to any guardian factory in the suite —
    # that is the whole point of this record (an unmatched payer). Derived from the sequence
    # the same way the guardian factory derives its own, offset so the two ranges never collide.
    sequence(:payer_cpf) do |n|
      base = ::Kernel.format("%09d", (n + 500_000_000) % 1_000_000_000)
      first = Cpf.check_digit(base.chars.map(&:to_i))
      second = Cpf.check_digit("#{base}#{first}".chars.map(&:to_i))
      "#{base}#{first}#{second}"
    end

    sequence(:payer_name) { |n| "Payer #{n}" }
    amount_cents { 85_000 }
    due_date { 10.days.from_now.to_date }
    provider_status { "open" }
    status { "pending" }

    trait :paid do
      provider_status { "paid" }
      paid_amount_cents { 85_000 }
      paid_at { Time.current }
      payment_method { "pix" }
    end

    trait :resolved do
      status { "resolved" }
      resolved_at { Time.current }
      resolved_by { association :user }
      resolved_guardian { association :guardian, school: school }
      charge { association :charge, school: school, guardian: resolved_guardian }
    end

    trait :dismissed do
      status { "dismissed" }
      resolved_at { Time.current }
      resolved_by { association :user }
    end
  end
end
