# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Livro Ata policies" do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:entry) { create(:minutes_entry, school: school) }
  let(:book) { entry.minutes_book }

  after { Current.reset }

  def act_as(membership)
    Current.user = membership.user
    Current.membership = membership
    Current.school = membership.school
    Current.effective_permission_keys = nil
    Current.guardian = nil
    membership.user
  end

  def staff_as(system_key, school: self.school)
    membership = create(:membership, :staff, user: create(:user), school: school)
    template = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates].fetch(system_key)
    create(:staff_profile, membership: membership, school: school, role_template: template)
    act_as(membership)
  end

  %w[director coordination secretary].each do |system_key|
    context "as #{system_key}" do
      let!(:user) { staff_as(system_key) }

      it "may list, read, create, edit, send and cancel entries and books" do
        entry_policy = MinutesEntryPolicy.new(user, entry)
        book_policy = MinutesBookPolicy.new(user, book)

        expect(entry_policy).to be_index.and be_show.and be_create.and be_update
        expect(entry_policy).to be_pdf.and be_send_for_signature.and be_cancel
        expect(book_policy).to be_index.and be_show.and be_create
      end

      it "sees only this school's kept records" do
        entry
        create(:minutes_entry, school: other_school)
        create(:minutes_entry, :discarded, school: school)
        create(:minutes_book, :discarded, school: school)

        expect(MinutesEntryPolicy::Scope.new(user, MinutesEntry).resolve).to include(entry)
        expect(MinutesEntryPolicy::Scope.new(user, MinutesEntry).resolve.map(&:school_id).uniq).to eq([ school.id ])
        expect(MinutesEntryPolicy::Scope.new(user, MinutesEntry).resolve).to all(be_kept)
        expect(MinutesBookPolicy::Scope.new(user, MinutesBook).resolve).to include(book)
        expect(MinutesBookPolicy::Scope.new(user, MinutesBook).resolve).to all(be_kept)
        expect(MinutesBookPolicy::Scope.new(user, MinutesBook).resolve.map(&:school_id).uniq).to eq([ school.id ])
      end

      it "is denied another school's record" do
        foreign = create(:minutes_entry, school: other_school)

        expect(MinutesEntryPolicy.new(user, foreign)).not_to be_show
        expect(MinutesEntryPolicy.new(user, foreign)).not_to be_update
        expect(MinutesBookPolicy.new(user, foreign.minutes_book)).not_to be_show
      end
    end
  end

  %w[teacher].each do |system_key|
    it "denies a #{system_key} staff member everything" do
      user = staff_as(system_key)

      expect(MinutesEntryPolicy.new(user, entry)).not_to be_index
      expect(MinutesEntryPolicy.new(user, entry)).not_to be_show
      expect(MinutesEntryPolicy.new(user, entry)).not_to be_create
      expect(MinutesBookPolicy.new(user, book)).not_to be_index
      expect(MinutesEntryPolicy::Scope.new(user, MinutesEntry).resolve).to be_empty
    end
  end

  it "denies staff without a role template" do
    membership = create(:membership, :staff, user: create(:user), school: school)
    user = act_as(membership)

    expect(MinutesEntryPolicy.new(user, entry)).not_to be_index
    expect(MinutesBookPolicy::Scope.new(user, MinutesBook).resolve).to be_empty
  end

  it "denies a director whose staff profile was discarded" do
    user = staff_as("director")
    Current.membership.staff_profile.discard

    expect(MinutesEntryPolicy.new(user, entry)).not_to be_index
  end

  it "denies an invited (inactive) director" do
    user = staff_as("director")
    Current.membership.update_columns(status: "invited")

    expect(MinutesEntryPolicy.new(user, entry)).not_to be_index
  end

  it "denies a guardian" do
    membership = create(:membership, user: create(:user), school: school, role: "guardian")
    user = act_as(membership)

    expect(MinutesEntryPolicy.new(user, entry)).not_to be_index
    expect(MinutesEntryPolicy.new(user, entry)).not_to be_show
    expect(MinutesEntryPolicy::Scope.new(user, MinutesEntry).resolve).to be_empty
  end
end
