# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contracts::RenderContractPdfService do
  let(:school) { create(:school, name: "Escola Demo") }
  let(:school_class) { create(:school_class, school: school, name: "A", year: 2026) }
  let(:student) do
    create(:student, school: school, school_class: school_class, name: "Pedro Silva",
                     cpf: "15852119075")
  end
  let(:mother) do
    create(:guardian, school: school, name: "Maria Silva", cpf: "12345678909",
                      email: "maria@example.com", city: "São Paulo", state: "SP")
  end
  let(:father) do
    create(:guardian, school: school, name: "João Silva", cpf: "52998224725",
                      email: "joao@example.com")
  end
  let(:contract) do
    create(:contract, school: school, student: student, negotiated_amount_cents: 125_050,
                      due_day: 10)
  end

  def link(guardian, relationship)
    create(:student_guardian, school: school, student: student, guardian: guardian,
                              relationship: relationship)
  end

  # Prawn compresses text streams, so the rendered bytes are read back rather than grepped.
  def text_of(pdf)
    PDF::Inspector::Text.analyze(pdf).strings.join(" ")
  end

  it "refuses to render a contract with no guardian" do
    result = described_class.call(contract: contract)

    expect(result).to be_failure
  end

  context "with both guardians" do
    before do
      link(mother, "mother")
      link(father, "father")
    end

    it "fills in the tuition, written as a contract states it" do
      pdf = described_class.call(contract: contract).data.fetch(:pdf)

      expect(text_of(pdf)).to include("1.250,50")
    end

    it "names both parties with their CPF" do
      text = text_of(described_class.call(contract: contract).data.fetch(:pdf))

      expect(text).to include("Maria Silva")
      expect(text).to include("123.456.789-09")
      expect(text).to include("João Silva")
      expect(text).to include("529.982.247-25")
    end

    it "labels each party by the relationship on file" do
      text = text_of(described_class.call(contract: contract).data.fetch(:pdf))

      expect(text).to include("pai")
      expect(text).to include("mãe")
    end

    it "names the student and the cohort" do
      text = text_of(described_class.call(contract: contract).data.fetch(:pdf))

      expect(text).to include("Pedro Silva")
      expect(text).to include("Turma A")
    end

    it "states the due day" do
      expect(text_of(described_class.call(contract: contract).data.fetch(:pdf)))
        .to include("dia 10")
    end
  end

  describe "signature placement" do
    before do
      link(mother, "mother")
      link(father, "father")
    end

    let(:positions) { described_class.call(contract: contract).data.fetch(:signature_positions) }

    it "reports one position per guardian, keyed by guardian" do
      expect(positions.keys).to match_array([mother.id, father.id])
    end

    # Autentique takes percentages of the page from its top-left corner.
    it "expresses the position as a percentage of the page" do
      position = positions.fetch(mother.id)

      expect(position[:x]).to be_between(0, 100)
      expect(position[:y]).to be_between(0, 100)
      expect(position[:z]).to eq(1)
    end

    # The exact figure follows the layout; what matters is that the fields land under the body,
    # not over the heading or the parties table.
    it "puts the signatures below the body of the contract" do
      positions.each_value { |position| expect(position[:y]).to be > 40 }
    end

    # The second guardian signs under the first, never above.
    it "orders the lines down the page" do
      expect(positions.fetch(father.id)[:y]).to be > positions.fetch(mother.id)[:y]
    end

    # The two guardians sign on separate lines, so their fields must not land on top of each other.
    it "gives each guardian a distinct line" do
      ys = positions.values.map { |position| position[:y] }

      expect(ys.uniq.length).to eq(2)
      expect((ys.max - ys.min).abs).to be > 2
    end

    it "aligns the field with the left margin of the text" do
      # 56pt margin on a 595pt-wide A4 page is about 9.4%.
      expect(positions.fetch(mother.id)[:x]).to be_within(0.5).of(9.4)
    end
  end

  # A single responsible adult must read as one party, not as a contract missing a signatory.
  context "with one guardian" do
    before { link(mother, "mother") }

    it "names only that guardian" do
      text = text_of(described_class.call(contract: contract).data.fetch(:pdf))

      expect(text).to include("Maria Silva")
      expect(text).not_to include("João Silva")
    end

    it "renders a valid PDF" do
      pdf = described_class.call(contract: contract).data.fetch(:pdf)

      expect(pdf).to start_with("%PDF")
    end

    it "names the file after the student" do
      filename = described_class.call(contract: contract).data.fetch(:filename)

      expect(filename).to include("pedro-silva")
      expect(filename).to end_with(".pdf")
    end
  end
end
