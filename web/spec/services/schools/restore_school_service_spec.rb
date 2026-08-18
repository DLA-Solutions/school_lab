# frozen_string_literal: true

require "rails_helper"

RSpec.describe Schools::RestoreSchoolService do
  subject(:result) { described_class.call(school: school, actor: backoffice_user) }

  let(:backoffice_user) { create(:user) }
  let(:school) { create(:school).tap { |record| record.discard! } }

  it "undiscards the school" do
    expect(result.success?).to be(true)
    expect(School.kept).to include(school.reload)
    expect(school.discarded_by).to be_nil
  end

  context "when school is active" do
    let(:school) { create(:school) }

    it "returns not_discarded" do
      expect(result.success?).to be(false)
      expect(result.error_code).to eq(:not_discarded)
    end
  end
end
