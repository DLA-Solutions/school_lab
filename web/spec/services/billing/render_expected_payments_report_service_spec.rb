# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::RenderExpectedPaymentsReportService do
  subject(:result) do
    described_class.call(school: school, contracts: Contract.all, columns: columns,
                         school_class: school_class, status: status)
  end

  let(:school) { create(:school, name: "Colégio Exemplo") }
  let(:columns) { nil }
  let(:school_class) { nil }
  let(:status) { "active" }

  let(:fifth) do
    create(:school_class, school: school, name: "A", grade_level: "fundamental_i_5", year: 2026)
  end
  let(:infantil) do
    create(:school_class, school: school, name: "A", grade_level: "infantil_2", year: 2026)
  end

  def student_in(school_class, name, **attrs)
    create(:student, school: school, school_class: school_class, name: name, **attrs)
  end

  def link(student, guardian, relationship: "mother")
    create(:student_guardian, school: school, student: student, guardian: guardian,
                              relationship: relationship)
  end

  def contract_for(student, cents:, **attrs)
    create(:contract, school: school, student: student, negotiated_amount_cents: cents, **attrs)
  end

  def pages
    PDF::Reader.new(StringIO.new(result.data.fetch(:pdf))).pages.map(&:text)
  end

  def text
    pages.join("\n")
  end

  describe "the pages" do
    let!(:pedro) { student_in(fifth, "Pedro Silva") }
    let!(:zoe) { student_in(infantil, "Zoe Alves") }
    let!(:ana) { student_in(fifth, "Ana Souza") }

    before do
      contract_for(pedro, cents: 100_000)
      contract_for(ana, cents: 50_050)
      contract_for(zoe, cents: 70_000)
    end

    it "succeeds with a PDF and a dated filename" do
      expect(result).to be_success
      expect(result.data.fetch(:pdf)).to start_with("%PDF")
      expect(result.data.fetch(:filename))
        .to eq("valores-previstos-colegio-exemplo-#{Date.current.strftime('%Y-%m-%d')}.pdf")
    end

    it "puts one class on each page, in teaching order" do
      expect(pages.size).to eq(2)
      expect(pages.first).to include("Zoe Alves")
      expect(pages.first).not_to include("Pedro Silva")
      expect(pages.last).to include("Pedro Silva", "Ana Souza")
    end

    it "lists the children of a class alphabetically" do
      expect(pages.last.index("Ana Souza")).to be < pages.last.index("Pedro Silva")
    end

    it "closes each class with its subtotal and the report with the grand total" do
      expect(pages.first).to include("Subtotal da turma", "R$ 700,00")
      expect(pages.last).to include("Subtotal da turma", "R$ 1.500,50")
      expect(pages.last).to include("Total geral: R$ 2.200,50", "3 estudante(s), 0 sem contrato")
      expect(pages.first).not_to include("Total geral")
    end

    it "agrees to the cent with the dashboard's figure for the same contracts" do
      dashboard = Dashboards::SchoolMetricsService.call(school: school)
                                                  .data.dig(:average_ticket, :total_monthly_cents)

      expect(dashboard).to eq(220_050)
      expect(text).to include("R$ 2.200,50")
    end
  end

  describe "the amount of a contract" do
    let!(:pedro) { student_in(fifth, "Pedro Silva") }

    it "falls back to the plan's list price when nothing was negotiated" do
      plan = create(:billing_plan, school: school, base_amount_cents: 90_000)
      contract_for(pedro, cents: nil, billing_plan: plan)

      expect(text).to include("R$ 900,00")
    end

    it "is zero, not missing, when the plan has no price either" do
      plan = create(:billing_plan, school: school, base_amount_cents: nil)
      contract_for(pedro, cents: nil, billing_plan: plan)

      expect(text).to include("R$ 0,00")
      expect(text).not_to include("Sem contrato")
    end

    it "adds up a child's several active contracts, as the dashboard does" do
      contract_for(pedro, cents: 80_000)
      contract_for(pedro, cents: 20_000)

      expect(text).to include("R$ 1.000,00")
    end

    it "ignores contracts that are not active" do
      contract_for(pedro, cents: 80_000)
      contract_for(pedro, cents: 999_900, status: "ended")
      contract_for(pedro, cents: 888_800, status: "suspended")
      contract_for(pedro, cents: 777_700).discard

      expect(text).to include("R$ 800,00")
      expect(text).not_to include("9.999,00", "8.888,00", "7.777,00")
    end
  end

  describe "a child with no active contract" do
    let!(:pedro) { student_in(fifth, "Pedro Silva") }
    let!(:ana) { student_in(fifth, "Ana Souza") }

    before { contract_for(ana, cents: 50_000) }

    it "is still listed, as not contracted, and adds nothing to the total" do
      expect(text).to include("Pedro Silva", "Sem contrato")
      expect(text).to include("Total geral: R$ 500,00", "2 estudante(s), 1 sem contrato")
    end

    it "is also listed when the only contract has ended" do
      contract_for(pedro, cents: 10_000, status: "ended")

      expect(text).to include("Sem contrato")
      expect(text).to include("Total geral: R$ 500,00")
    end
  end

  describe "a child with no class" do
    let!(:ana) { student_in(fifth, "Ana Souza") }
    # A class is required on write, so a legacy row without one is set up around the validation.
    let!(:loose) { student_in(fifth, "Lucas Solto") }

    before do
      loose.update_column(:school_class_id, nil)
      contract_for(ana, cents: 50_000)
      contract_for(loose, cents: 30_000)
    end

    it "is printed last, under 'Sem turma', counted in the total" do
      expect(pages.size).to eq(2)
      expect(pages.last).to include("Sem turma", "Lucas Solto", "R$ 300,00")
      expect(pages.first).not_to include("Lucas Solto")
      expect(pages.last).to include("Total geral: R$ 800,00")
    end

    it "is printed there too when the class was discarded" do
      fifth.discard

      expect(pages.size).to eq(1)
      expect(text).to include("Sem turma", "Ana Souza", "Lucas Solto")
    end
  end

  describe "who is listed" do
    let!(:pedro) { student_in(fifth, "Pedro Silva") }

    before { contract_for(pedro, cents: 10_000) }

    it "leaves out discarded students, and their contracts" do
      gone = student_in(fifth, "Removido Antigo")
      contract_for(gone, cents: 500_000)
      gone.discard

      expect(text).not_to include("Removido Antigo")
      expect(text).to include("Total geral: R$ 100,00")
    end

    it "leaves out another school's children and contracts" do
      other = create(:school)
      stranger = create(:student, school: other, name: "Intruso Estranho")
      create(:contract, school: other, student: stranger, negotiated_amount_cents: 999_999)

      expect(text).not_to include("Intruso Estranho")
      expect(text).to include("Total geral: R$ 100,00")
    end

    it "does not count another school's contract on this school's child" do
      other = create(:school)
      create(:contract, school: other, student: pedro, negotiated_amount_cents: 999_999,
                        billing_plan: create(:billing_plan, school: other))

      expect(text).to include("Total geral: R$ 100,00")
    end

    it "reports only active students by default and the transferred ones on request" do
      moved = student_in(fifth, "Transferido Tadeu", status: "transferred")

      expect(text).not_to include("Transferido Tadeu")

      transferred = described_class.call(school: school, contracts: Contract.all, status: "transferred")
      body = PDF::Reader.new(StringIO.new(transferred.data.fetch(:pdf))).pages.map(&:text).join
      expect(body).to include("Transferido Tadeu")
      expect(body).not_to include("Pedro Silva")

      everyone = described_class.call(school: school, contracts: Contract.all, status: "all")
      body = PDF::Reader.new(StringIO.new(everyone.data.fetch(:pdf))).pages.map(&:text).join
      expect(body).to include("Transferido Tadeu", "Pedro Silva")
      expect(moved).to be_persisted
    end

    context "when narrowed to one class" do
      let(:school_class) { fifth }

      it "lists that class alone" do
        student_in(infantil, "Zoe Alves")

        expect(pages.size).to eq(1)
        expect(text).to include("Pedro Silva")
        expect(text).not_to include("Zoe Alves")
        expect(text).to include("Total geral: R$ 100,00")
      end
    end

    it "prints a placeholder rather than failing when nobody matches" do
      Student.update_all(discarded_at: Time.current)

      expect(result).to be_success
      expect(text).to include("Nenhum registro para os filtros escolhidos.")
      expect(text).not_to include("Total geral")
    end
  end

  describe "the guardians" do
    let!(:pedro) { student_in(fifth, "Pedro Silva") }
    let!(:maria) { create(:guardian, school: school, name: "Maria Silva") }
    let!(:jose) { create(:guardian, school: school, name: "José Silva") }
    let!(:old) { create(:guardian, school: school, name: "Antiga Responsável") }

    before do
      link(pedro, maria, relationship: "mother")
      link(pedro, jose, relationship: "father")
      link(pedro, old, relationship: "other").discard
    end

    it "names every kept guardian and marks the one the contract names as payer" do
      contract_for(pedro, cents: 10_000, payer_guardian: jose)

      expect(text).to include("José Silva (pagador)", "Maria Silva")
      expect(text).not_to include("Maria Silva (pagador)")
      expect(text).not_to include("Antiga Responsável")
    end

    it "marks the first guardian when the contract names no payer" do
      contract_for(pedro, cents: 10_000)

      expect(text.scan("(pagador)").size).to eq(1)
    end

    it "marks nobody when the child has no contract" do
      expect(text).not_to include("(pagador)")
    end

    it "leaves out a discarded guardian even if the link is kept" do
      maria.discard
      contract_for(pedro, cents: 10_000, payer_guardian: jose)

      expect(text).not_to include("Maria Silva")
    end

    it "never prints a CPF, however many columns are asked for" do
      contract_for(pedro, cents: 10_000)
      all = described_class.call(
        school: school, contracts: Contract.all,
        columns: %w[student guardians plan signature_status expected_amount cpf]
      )
      body = PDF::Reader.new(StringIO.new(all.data.fetch(:pdf))).pages.map(&:text).join

      [ pedro.cpf, maria.cpf, jose.cpf ].each do |cpf|
        expect(body).not_to include(cpf)
        expect(body).not_to include(Cpf.format(cpf))
      end
      expect(body).not_to include("CPF")
    end
  end

  describe "the columns" do
    let!(:pedro) { student_in(fifth, "Pedro Silva") }

    before { contract_for(pedro, cents: 10_000, signature_status: "signed") }

    it "defaults to student, guardians and the expected amount" do
      expect(text).to include("Estudante", "Responsáveis", "Valor previsto (mensal)")
      expect(text).not_to include("Plano")
      expect(text).not_to include("Assinatura")
    end

    context "when asked for the optional ones" do
      let(:columns) { %w[student plan signature_status expected_amount] }

      it "draws them, in the report's own order" do
        expect(text).to include("Plano", "Assinatura", "Assinado")
        expect(text).not_to include("Responsáveis")
      end
    end

    context "without the amount column" do
      let(:columns) { %w[student] }

      it "draws no subtotal or total" do
        expect(text).to include("Pedro Silva")
        expect(text).not_to include("Subtotal")
        expect(text).not_to include("Total geral")
      end
    end

    context "with only the amount column" do
      let(:columns) { %w[expected_amount] }

      it "still shows the subtotal in the single column" do
        expect(text).to include("Subtotal da turma: R$ 100,00")
      end
    end

    context "with columns nobody offered" do
      let(:columns) { %w[student encrypted_password] }

      it "drops them" do
        expect(text).to include("Estudante")
        expect(text).not_to include("encrypted_password")
      end
    end
  end

  describe "a name the PDF font cannot draw" do
    it "fails cleanly instead of raising" do
      student_in(fifth, "Тест Кириллица")

      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end
end
