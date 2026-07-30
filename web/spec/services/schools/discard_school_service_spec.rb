# frozen_string_literal: true

require "rails_helper"

RSpec.describe Schools::DiscardSchoolService do
  subject(:result) { described_class.call(school: school, actor: backoffice_user) }

  let(:backoffice_user) { create(:user) }
  let(:school) { create(:school) }

  it "soft deletes the school" do
    expect(result.success?).to be(true)
    expect(School.kept).not_to include(school.reload)
    expect(school.discarded_by).to eq(backoffice_user)
  end

  context "when school is already discarded" do
    before { school.discard }

    it "returns invalid_state_transition" do
      expect(result.success?).to be(false)
      expect(result.error_code).to eq(:invalid_state_transition)
    end
  end
end
