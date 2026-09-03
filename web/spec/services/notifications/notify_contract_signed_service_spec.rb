# frozen_string_literal: true

require "rails_helper"

RSpec.describe Notifications::NotifyContractSignedService do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }
  let(:contract) { create(:contract, school: school, student: student) }

  let(:billing_user) { create(:user) }
  let(:billing_membership) { create(:membership, :staff, user: billing_user, school: school) }
  let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

  before do
    create(:staff_profile, membership: billing_membership, school: school, role_template: secretary_template)
    create(
      :membership_permission,
      membership: billing_membership, school: school,
      permission_key: "manage_billing", effect: "grant"
    )
  end

  it "notifies staff members with the manage_billing permission" do
    expect do
      described_class.call(contract: contract)
    end.to change(Notification, :count).by(1)

    notification = Notification.last
    expect(notification.user).to eq(billing_user)
    expect(notification.school).to eq(school)
    expect(notification.contract).to eq(contract)
    expect(notification.kind).to eq("contract_signed")
    expect(notification.title).to eq("Contrato assinado")
    expect(notification.body).to eq("O contrato de Pedro Silva foi assinado por todas as partes.")
  end

  it "does not notify a staff member without the manage_billing permission" do
    other_user = create(:user)
    other_membership = create(:membership, :staff, user: other_user, school: school)
    other_template = create_system_templates_for(school).find { |t| t.system_key == "teacher" }
    create(:staff_profile, membership: other_membership, school: school, role_template: other_template)

    described_class.call(contract: contract)

    expect(Notification.where(user: other_user)).to be_empty
  end

  it "does not notify a guardian membership" do
    guardian_user = create(:user)
    create(:membership, role: "guardian", user: guardian_user, school: school)

    described_class.call(contract: contract)

    expect(Notification.where(user: guardian_user)).to be_empty
  end

  it "does not notify a staff member from a different school" do
    other_school = create(:school)
    other_user = create(:user)
    other_membership = create(:membership, :staff, user: other_user, school: other_school)
    other_template = create_system_templates_for(other_school).find { |t| t.system_key == "secretary" }
    create(:staff_profile, membership: other_membership, school: other_school, role_template: other_template)
    create(
      :membership_permission,
      membership: other_membership, school: other_school,
      permission_key: "manage_billing", effect: "grant"
    )

    described_class.call(contract: contract)

    expect(Notification.where(user: other_user)).to be_empty
  end
end
