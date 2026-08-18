# frozen_string_literal: true

require "rails_helper"

# Putting a school's existing families on file from the vCard export their old system produced.
# The list arrives with holes, and a register that refused it would only mean the school keeps
# its families where they already are.
RSpec.describe People::ImportGuardiansVcardService do
  let(:school) { create(:school) }

  # Test CPFs with valid check digits; nobody's real document.
  let(:vcard) do
    <<~VCF
      BEGIN:VCARD
      VERSION:3.0
      FN:ALANA DE CARVALHO
      TITLE:SP
      TEL;TYPE=HOME:62992127228
      EMAIL:alana@example.com
      X-CPF:11144477735
      ADR;TYPE=HOME:;;RUA MARAJÓ;PARQUE AMAZONIA;;74835230;BR
      END:VCARD

      BEGIN:VCARD
      VERSION:3.0
      FN:ALBERTO SIQUEIRA
      TITLE:NÃO INFORMADO
      X-CPF:12345678909
      ADR;TYPE=HOME:;;;;;00000000;BR
      END:VCARD
    VCF
  end

  def import(text = vcard, dry_run: false)
    described_class.call(school: school, vcard_text: text, dry_run: dry_run)
  end

  it "puts every card on file" do
    expect(import).to be_success
    expect(school.guardians.kept.pluck(:name))
      .to contain_exactly("ALANA DE CARVALHO", "ALBERTO SIQUEIRA")
  end

  it "keeps what the card carries" do
    import

    expect(school.guardians.kept.find_by(cpf: "11144477735")).to have_attributes(
      email: "alana@example.com", phone: "62992127228",
      street: "RUA MARAJÓ", neighborhood: "PARQUE AMAZONIA", zip_code: "74835230"
    )
  end

  # The form the secretary fills in still asks for all of it; this is the school's old list.
  it "saves a guardian with no e-mail, no phone and no address" do
    import

    alberto = school.guardians.kept.find_by(cpf: "12345678909")
    expect(alberto).to be_present
    expect(alberto.email).to be_blank
    expect(alberto.phone).to be_blank
    expect(alberto.street).to be_blank
  end

  # `00000000` is how these exports write "we never wrote it down"; storing it would make an
  # unusable address look complete.
  it "does not keep a postcode of zeros" do
    import

    expect(school.guardians.kept.find_by(cpf: "12345678909").zip_code).to be_nil
  end

  # A record saved with holes is worth having; a hole nobody is told about is not.
  it "names what the school still has to chase" do
    result = import

    gaps = result.data[:incomplete].find { |row| row[:cpf] == "12345678909" }
    expect(gaps[:missing]).to include("e-mail", "telefone", "endereço", "CEP")
  end

  # A guessed correction sends somebody's mail to a stranger.
  it "drops an e-mail that is not one, and says so" do
    result = import(<<~VCF)
      BEGIN:VCARD
      FN:THIAGO DE ARAUJO
      EMAIL:nÃo informado
      TEL;TYPE=HOME:62999672010
      X-CPF:98765432100
      END:VCARD
    VCF

    expect(school.guardians.kept.find_by(cpf: "98765432100").email).to be_blank
    expect(result.data[:incomplete].first[:missing].join).to include("e-mail inválido")
  end

  it "trims an address the export padded with a space" do
    import(<<~VCF)
      BEGIN:VCARD
      FN:ELLEN JORDANA
      EMAIL: ellen@example.com
      X-CPF:98765432100
      END:VCARD
    VCF

    expect(school.guardians.kept.find_by(cpf: "98765432100").email).to eq("ellen@example.com")
  end

  # Matched on CPF: the school re-imports the corrected file rather than hunting for the row.
  it "updates the same people rather than duplicating them" do
    import
    result = import

    expect(school.guardians.kept.count).to eq(2)
    expect(result.data[:created]).to be_empty
    expect(result.data[:updated].size).to eq(2)
  end

  it "leaves alone what the card does not carry" do
    import
    school.guardians.kept.find_by(cpf: "12345678909").update!(email: "alberto@example.com")

    import

    expect(school.guardians.kept.find_by(cpf: "12345678909").email).to eq("alberto@example.com")
  end

  it "writes nothing on a dry run" do
    result = import(dry_run: true)

    expect(result.data[:created].size).to eq(2)
    expect(school.guardians.kept.count).to eq(0)
  end

  it "reports a card with no CPF rather than failing the whole file" do
    result = import(<<~VCF)
      BEGIN:VCARD
      FN:SEM CPF
      END:VCARD

      BEGIN:VCARD
      FN:COM CPF
      X-CPF:98765432100
      END:VCARD
    VCF

    expect(result.data[:failed].map { |row| row[:name] }).to eq([ "SEM CPF" ])
    expect(school.guardians.kept.pluck(:name)).to eq([ "COM CPF" ])
  end

  # A secretary correcting a phone number must not be met with six errors about an address the
  # school never had.
  it "lets a gap that arrived with the import be edited without filling in everything" do
    import
    alberto = school.guardians.kept.find_by(cpf: "12345678909")

    expect(alberto.update(phone: "62999999999")).to be(true)
  end

  # Once filled, it can no longer be emptied.
  it "refuses to empty a field that was filled" do
    import
    alana = school.guardians.kept.find_by(cpf: "11144477735")

    expect(alana.update(street: "")).to be(false)
    expect(alana.errors.attribute_names).to include(:street)
  end

  # The interactive form is untouched: a guardian typed in by hand still needs the full address.
  it "still demands the address of a guardian created outside an import" do
    guardian = school.guardians.build(name: "Sem endereço", cpf: "98765432100",
                                      email: "a@example.com", phone: "62999999999")

    expect(guardian).not_to be_valid
    expect(guardian.errors.attribute_names).to include(:street, :city, :state, :number)
  end

  it "says plainly when the file holds no cards" do
    result = import("nada aqui")

    expect(result).to be_failure
    expect(result.error_code).to eq(:no_cards_found)
  end
end
