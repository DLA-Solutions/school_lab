# frozen_string_literal: true

require "rails_helper"

# Putting a school's existing staff on file from the vCard export their phone or their old system
# produced — the form the list actually arrives in.
RSpec.describe People::ImportCollaboratorsVcardService do
  let(:school) { create(:school) }

  # Test CPFs with valid check digits; nobody's real document.
  let(:vcard) do
    <<~VCF
      BEGIN:VCARD
      VERSION:3.0
      FN:MARIA TAVARES DE SOUSA
      N:MARIA TAVARES DE SOUSA;;;;
      TITLE:PROFESSOR
      TEL;TYPE=HOME:62994616013
      X-CPF:11144477735
      ADR;TYPE=HOME:;;RUA 20;SETOR CENTRAL;;74020170;BR
      END:VCARD

      BEGIN:VCARD
      VERSION:3.0
      FN:DAIANE TELLES
      N:DAIANE TELLES;;;;
      TITLE:COORDENADOR ADMINISTRATIVO
      EMAIL:daianne@example.com
      X-CPF:12345678909
      ADR;TYPE=HOME:;;QUADRA 6\\, LOTE 5;ZONA RURAL;;75375000;BR
      END:VCARD
    VCF
  end

  def import(text = vcard, dry_run: false)
    described_class.call(school: school, vcard_text: text, dry_run: dry_run)
  end

  it "puts every card on file" do
    result = import

    expect(result).to be_success
    expect(school.teachers.kept.pluck(:name))
      .to contain_exactly("MARIA TAVARES DE SOUSA", "DAIANE TELLES")
  end

  it "keeps the address the card carries" do
    import

    maria = school.teachers.kept.find_by(cpf: "11144477735")
    expect(maria).to have_attributes(
      street: "RUA 20", neighborhood: "SETOR CENTRAL", zip_code: "74020170",
      phone: "62994616013"
    )
  end

  # `QUADRA 6\, LOTE 5` is one street, not two fields — the comma is escaped for a reason.
  it "reads an escaped comma as part of the street" do
    import

    expect(school.teachers.kept.find_by(cpf: "12345678909").street).to eq("QUADRA 6, LOTE 5")
  end

  # A school putting its staff on file has an e-mail for some of them and not for others.
  it "accepts a collaborator with no e-mail" do
    import

    expect(school.teachers.kept.find_by(cpf: "11144477735").email).to be_blank
  end

  # "PROFESSOR" against a register that already says "Professor(a)" is the same post.
  it "reuses a post the school already has, however it is spelled" do
    existing = create(:job_position, school: school, name: "Professor(a)")

    import

    expect(school.teachers.kept.find_by(cpf: "11144477735").job_position).to eq(existing)
    expect(result_positions_named("Professor")).to be_empty
  end

  it "creates the post the school does not have, and says which" do
    result = import

    expect(result.data[:positions_created]).to include("Coordenador Administrativo")
    expect(school.job_positions.kept.pluck(:name)).to include("Coordenador Administrativo")
  end

  # Matched on CPF: a school correcting one address re-imports the file rather than hunting for
  # the row.
  it "updates the same people rather than duplicating them" do
    import
    result = import

    expect(school.teachers.kept.count).to eq(2)
    expect(result.data[:created]).to be_empty
    expect(result.data[:updated].size).to eq(2)
  end

  # A card with no e-mail must not blank out an e-mail somebody typed in afterwards.
  it "leaves alone what the card does not carry" do
    import
    school.teachers.kept.find_by(cpf: "11144477735").update!(email: "maria@example.com")

    import

    expect(school.teachers.kept.find_by(cpf: "11144477735").email).to eq("maria@example.com")
  end

  it "writes nothing on a dry run" do
    result = import(dry_run: true)

    expect(result).to be_success
    expect(result.data[:created].size).to eq(2)
    expect(school.teachers.kept.count).to eq(0)
  end

  it "reports a card it could not save rather than failing the whole file" do
    result = import(<<~VCF)
      BEGIN:VCARD
      FN:SEM CPF
      TITLE:PROFESSOR
      END:VCARD

      BEGIN:VCARD
      FN:COM CPF
      TITLE:PROFESSOR
      X-CPF:98765432100
      END:VCARD
    VCF

    expect(result.data[:failed].map { |row| row[:name] }).to eq([ "SEM CPF" ])
    expect(school.teachers.kept.pluck(:name)).to eq([ "COM CPF" ])
  end

  it "says plainly when the file holds no cards" do
    result = import("nada aqui")

    expect(result).to be_failure
    expect(result.error_code).to eq(:no_cards_found)
  end

  def result_positions_named(name)
    school.job_positions.kept.where(name: name)
  end
end
