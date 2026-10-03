# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReportCards::MaterializeSnapshotService do
  include PermissionsFactoryHelpers

  let(:school) { create(:school) }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:school_year) { create(:school_year, :custom, school: school) }
  let(:period) { create(:academic_period, school_year: school_year, school: school, closure_status: "closing") }
  let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
  let(:subject_record) { create(:subject, school: school) }
  let!(:class_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: subject_record,
                              school_year: school_year)
  end
  let!(:student) { create(:student, school: school, school_class: school_class) }
  let!(:signatory) { create(:document_signatory, school: school) }
  let!(:config) do
    create(:report_card_config, school: school, document_signatory: signatory,
                                created_by_membership: owner_membership)
  end

  before { Current.membership = owner_membership }

  # Regression for #computed_final: a successful grade_launch (BR-RC05) only proves the
  # discipline was launched, never that every component already has a value. Before the fix,
  # `components.sum` defaulted its running total to the Integer 0, and when the discipline's only
  # component had no grade entry at all, `0.round(2, BigDecimal::ROUND_HALF_UP)` raised
  # ArgumentError -- Integer#round does not accept a rounding-mode positional argument -- turning
  # a legitimate publish into a 500 instead of a blank/zero final value.
  it "renders a zero final value instead of raising when a component has no grade entry" do
    template = create(:evaluation_template, school: school, school_class: school_class,
                                             academic_period: period, created_by_membership: owner_membership)
    create(:evaluation_component, school: school, evaluation_template: template,
                                  class_discipline: class_discipline, grade_scale: create(:grade_scale, school: school))
    create(:grade_launch, school: school, school_class: school_class, class_discipline: class_discipline,
                          academic_period: period, launched_by_membership: owner_membership)
    # Deliberately no grade_entry at all for the one component above.

    result = nil
    expect do
      result = described_class.call(student: student, school_class: school_class, academic_period: period,
                                     config: config)
    end.not_to raise_error

    expect(result).to be_success
    row = result.data[:disciplines].find { |discipline| discipline[:class_discipline_id] == class_discipline.id }
    expect(row[:final_value]).to eq("0.0")
  end
end
