# frozen_string_literal: true

require "rails_helper"

# The contract binds two parties. Until the school had an address to sign from, only the guardians
# were sent to the provider and the school merely received a copy of what it had agreed to.
RSpec.describe "The school as a party to its own contracts" do
  let(:school) do
    create(:school, name: "Colégio Exemplo", cnpj: "66.154.330/0001-40",
                    signature_email: "colegionsrgo@gmail.com")
  end
  let(:school_class) { create(:school_class, school: school) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:mother) { create(:guardian, school: school, name: "Maria Silva", cpf: "12345678909") }
  let(:plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: plan) }

  before do
    create(:student_guardian, school: school, student: student, guardian: mother,
                              relationship: "mother")
    school.create_contract_template!(
      body_html: "<p>{{aluno.nome}}</p>", copy_emails: [ "colegionsrgo@gmail.com" ]
    )
  end

  # The request never leaves: the adapter is stubbed so this asserts what would be sent.
  def dispatched_request
    captured = nil
    adapter = instance_double(Gateways::Signature::Autentique::Adapter)

    allow(Gateways::Signature::Registry).to receive(:active_config)
      .and_return(instance_double(SchoolSignatureProvider, provider: "autentique"))
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
    allow(adapter).to receive(:create_document) do |request|
      captured = request
      Gateways::Signature::ValueObjects::RemoteDocument.new(
        provider_document_id: "doc-1", status: "pending"
      )
    end

    Contracts::SendForSignatureService.call(contract: contract)
    captured
  end

  it "asks the school to sign alongside the guardians" do
    request = dispatched_request

    expect(request.signers.map(&:email))
      .to eq([ mother.email, "colegionsrgo@gmail.com" ])
  end

  # A legal entity is identified by its CNPJ, not by anybody's CPF.
  it "identifies the school by its CNPJ, in bare digits" do
    school_party = dispatched_request.signers.last

    expect(school_party.cnpj).to eq("66154330000140")
    expect(school_party.cpf).to be_nil
    expect(school_party.name).to eq("Colégio Exemplo")
  end

  it "still identifies each guardian by their CPF" do
    guardian_party = dispatched_request.signers.first

    expect(guardian_party.cpf).to eq(mother.cpf)
    expect(guardian_party.cnpj).to be_nil
  end

  # A party does not need to be copied as well, or the school receives the document twice.
  it "drops the school's address from the copies once it signs" do
    expect(dispatched_request.copy_emails).to be_empty
  end

  it "keeps copies that belong to nobody signing" do
    school.contract_template.update!(
      copy_emails: [ "colegionsrgo@gmail.com", "secretaria@exemplo.com" ]
    )

    expect(dispatched_request.copy_emails).to eq([ "secretaria@exemplo.com" ])
  end

  context "when the school has no address to sign from" do
    before { school.update!(signature_email: nil) }

    it "sends the contract to the guardians alone, as before" do
      request = dispatched_request

      expect(request.signers.map(&:email)).to eq([ mother.email ])
      expect(request.copy_emails).to eq([ "colegionsrgo@gmail.com" ])
    end
  end

  describe "what the provider is told" do
    # The document goes into `configs`, which is what makes the provider demand it from whoever
    # opens the link — so the party who signs is the party named on the contract.
    it "sends cnpj for the school and cpf for a guardian" do
      adapter = Gateways::Signature::Autentique::Adapter.allocate

      # One dispatch only: a second call would short-circuit on the document already sent.
      parties = dispatched_request.signers
      school_input = adapter.send(:signer_input, parties.last)
      guardian_input = adapter.send(:signer_input, parties.first)

      expect(school_input[:configs]).to eq(cnpj: "66154330000140")
      expect(guardian_input[:configs]).to eq(cpf: mother.cpf)
    end
  end
end
