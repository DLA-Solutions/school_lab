# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contracts::FillTemplateService do
  let(:school) { create(:school, name: "Colégio Exemplo", cnpj: "66.154.330/0001-40") }
  let(:school_class) do
    create(:school_class, school: school, name: "A", grade_level: "fundamental_i_5",
                          shift: "vespertino", year: 2026)
  end
  let(:student) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }
  let(:mother) { create(:guardian, school: school, name: "Maria Silva", cpf: "12345678909") }
  let(:father) { create(:guardian, school: school, name: "João Silva", cpf: "52998224725") }
  let(:plan) { create(:billing_plan, school: school) }

  def link(guardian, relationship)
    create(:student_guardian, school: school, student: student, guardian: guardian,
                              relationship: relationship)
  end

  def render_with(body_html)
    school.create_contract_template!(body_html: body_html)
    contract = create(:contract, school: school, student: student, billing_plan: plan,
                                  negotiated_amount_cents: nil)

    described_class.call(contract: contract).data.fetch(:html)
  end

  describe "the cohort" do
    # "A — 2026" named neither the grade nor the shift, which in a contract is the difference
    # between identifying the class the child is enrolled in and not.
    it "names the grade, the letter, the shift and the year" do
      link(mother, "mother")

      html = render_with("<p>{{aluno.turma}}</p>")

      expect(html).to include("Ensino Fundamental I — 5º ano A · Vespertino — 2026")
    end

    it "renders empty for a student with no cohort" do
      link(mother, "mother")
      student.update_column(:school_class_id, nil)

      expect(render_with("<p>[{{aluno.turma}}]</p>")).to include("[]")
    end
  end

  describe "both parents" do
    before do
      link(mother, "mother")
      link(father, "father")
    end

    it "lists each one under the parties, labelled by their relationship" do
      html = render_with("{{responsaveis}}")

      expect(html).to include("<strong>Mãe:</strong> Maria Silva")
      expect(html).to include("<strong>Pai:</strong> João Silva")
    end

    it "joins their names for the contracting parties" do
      expect(render_with("<p>{{responsaveis.nomes}}</p>")).to include("Maria Silva e João Silva")
    end

    # The document has to say on its face who is bound by it, not only whoever pays.
    it "gives each one a signing line at the foot" do
      html = render_with("{{responsaveis.assinaturas}}")

      expect(html).to include("Maria Silva — CPF 123.456.789-09 (Mãe)")
      expect(html).to include("João Silva — CPF 529.982.247-25 (Pai)")
    end

    it "asks both of them to sign" do
      contract = create(:contract, school: school, student: student, billing_plan: plan)

      expect(contract.signers.map(&:email)).to match_array([ mother.email, father.email ])
    end
  end

  describe "a single parent" do
    it "names only the one on file" do
      link(mother, "mother")

      html = render_with("{{responsaveis.assinaturas}}<p>{{responsaveis.nomes}}</p>")

      expect(html).to include("Maria Silva — CPF 123.456.789-09 (Mãe)")
      expect(html).not_to include("João Silva")
    end
  end

  # The values land inside HTML, so a name carrying markup must not be able to alter the document.
  it "escapes what it substitutes" do
    mother.update!(name: "Maria <script>alert(1)</script>")
    link(mother, "mother")

    html = render_with("{{responsaveis.assinaturas}}")

    expect(html).not_to include("<script>")
    expect(html).to include("&lt;script&gt;")
  end

  # The contract states the school's table price and what punctuality takes off it, so a family
  # can check both figures against what they are charged.
  describe "the punctuality discount" do
    before do
      link(mother, "mother")
      plan.update!(base_amount_cents: 124_915)
    end

    # Created per example rather than destroyed afterwards: the school carries the association, and
    # a destroyed record still answers from the instance the renderer was handed.
    def grant_punctuality_discount
      school.create_school_billing_settings!(
        early_payment_discount_percent: 10, early_payment_discount_day: 5
      )
    end

    it "states the table price, the discount and what is left" do
      grant_punctuality_discount
      html = render_with(
        "<p>{{contrato.valor.tabela}}|{{contrato.pontualidade.percentual}}|" \
        "{{contrato.pontualidade.desconto}}|{{contrato.pontualidade.valor}}|" \
        "{{contrato.pontualidade.dia}}</p>"
      )

      expect(html).to include("R$ 1.249,15|10%|R$ 124,92|R$ 1.124,23|5")
    end

    # The two figures have to add back up to the table price, or the contract does not balance.
    it "keeps the discount and the net amount consistent" do
      grant_punctuality_discount
      html = render_with("<p>{{contrato.pontualidade.desconto}}+{{contrato.pontualidade.valor}}</p>")
      discount, net = html[/R\$ [\d.,]+\+R\$ [\d.,]+/].split("+")
      to_cents = ->(value) { (value.delete("R$ .").tr(",", ".").to_d * 100).round }

      expect(to_cents.call(discount) + to_cents.call(net)).to eq(124_915)
    end

    it "writes amounts the way a contract does" do
      grant_punctuality_discount
      expect(render_with("<p>{{contrato.valor.tabela}}</p>")).to include("R$ 1.249,15")
    end

    context "when the school grants no punctuality discount" do
      it "leaves the discount fields empty rather than printing a nil" do
        html = render_with("<p>[{{contrato.pontualidade.percentual}}][{{contrato.pontualidade.dia}}]</p>")

        expect(html).to include("[][]")
      end
    end

    # A sibling band is an "other discount": the family already has a benefit, so that figure
    # (not the table price) is the reward for paying on time, and a late payment costs 10% more
    # than it — the same rule a negotiated amount follows below.
    context "when the contract also carries a plan discount" do
      it "runs punctuality the other way: the plan discount result is the on-time price, and being late costs 10% more" do
        grant_punctuality_discount
        discount = create(:plan_discount, school: school, name: "Desconto irmãos (2º filho)", percent: 5)
        school.create_contract_template!(
          body_html: "<p>{{contrato.desconto.nome}}|{{contrato.desconto.percentual}}|" \
                     "{{contrato.desconto.valor}}|{{contrato.valor}}|{{contrato.pontualidade.desconto}}|" \
                     "{{contrato.pontualidade.valor}}</p>"
        )
        contract = create(:contract, school: school, student: student, billing_plan: plan, plan_discount: discount)

        html = described_class.call(contract: contract).data.fetch(:html)

        # 124_915 * 0.95 = 118_669,25 -> R$ 1.186,69 (plan discount) is the on-time price;
        # being late costs 10% more: 118_669 * 0.10 = R$ 118,67 on top, i.e. R$ 1.305,36 owed
        # in full, R$ 1.186,69 if paid by the day.
        expect(html).to include(
          "Desconto irmãos (2º filho)|5%|R$ 62,46|R$ 1.305,36|R$ 118,67|R$ 1.186,69"
        )
      end
    end

    # A negotiated amount (a one-off override, not a sibling band) is an "other discount" too:
    # whatever the school agreed with the family is what is owed on time, and being late costs
    # 10% more than it — never a further discount off the table price.
    context "when the contract carries a negotiated amount instead of a plan discount" do
      it "runs punctuality the other way: the negotiated amount is the on-time price, and being late costs 10% more" do
        grant_punctuality_discount
        school.create_contract_template!(
          body_html: "<p>{{contrato.valor}}|{{contrato.pontualidade.desconto}}|" \
                     "{{contrato.pontualidade.valor}}</p>"
        )
        contract = create(:contract, school: school, student: student, billing_plan: plan,
                                      plan_discount: nil, negotiated_amount_cents: 87_430)

        html = described_class.call(contract: contract).data.fetch(:html)

        # The negotiated R$ 874,30 is what is owed on time; being late costs 10% more on top:
        # 87_430 * 0.10 = R$ 87,43, so R$ 961,73 is owed in full.
        expect(html).to include("R$ 961,73|R$ 87,43|R$ 874,30")
      end
    end
  end

  # The file is uploaded to Autentique as HTML and converted there, so how it is set is decided
  # here — there is no later chance to lay the document out.
  describe "how the document is set" do
    before { link(mother, "mother") }

    it "justifies the body text" do
      html = render_with("<p>Cláusula primeira.</p>")

      expect(html).to match(/\.contract p,\s*\.contract li \{[^}]*text-align: justify/m)
    end

    it "hyphenates, so justification does not open rivers of white space" do
      expect(render_with("<p>x</p>")).to include("hyphens: auto")
    end

    # Without a language the browser cannot break Portuguese words correctly.
    it "declares the document language" do
      expect(render_with("<p>x</p>")).to include('lang="pt-BR"')
    end

    # Centring is what makes a heading read as a heading, and a signature line as a place to sign.
    it "leaves headings centred and signature lines ranged left" do
      html = render_with("<h1>Contrato</h1>{{responsaveis.assinaturas}}")

      expect(html).to match(/h1 \{[^}]*text-align: center/)
      expect(html).to match(/\.signature \{[^}]*text-align: left/)
    end
  end

  describe "the built-in template" do
    it "carries a signing line for every party" do
      expect(ContractTemplate.default_body_html).to include("{{responsaveis.assinaturas}}")
    end

    it "offers the variable in the editor" do
      expect(ContractTemplate::VARIABLES).to have_key("responsaveis.assinaturas")
    end
  end
end
