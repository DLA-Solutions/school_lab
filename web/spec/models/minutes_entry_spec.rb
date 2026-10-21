# frozen_string_literal: true

require "rails_helper"

RSpec.describe MinutesEntry, type: :model do
  let(:school) { create(:school) }

  it "starts as a draft and is editable" do
    entry = create(:minutes_entry, school: school)

    expect(entry).to be_draft
    expect(entry).to be_editable
  end

  describe "validations" do
    it "requires title, held_on and a known kind" do
      entry = build(:minutes_entry, school: school, title: "", held_on: nil, kind: "other")

      expect(entry).not_to be_valid
      expect(entry.errors.attribute_names).to include(:title, :held_on, :kind)
    end

    it "keeps the kind fixed once created" do
      entry = create(:minutes_entry, school: school)

      expect(entry.update(kind: "final_results")).to be(false)
      expect(entry.errors).to be_of_kind(:kind, :immutable)
    end

    it "rejects a book from another school" do
      entry = build(:minutes_entry, school: school, minutes_book: create(:minutes_book))

      expect(entry).not_to be_valid
      expect(entry.errors.attribute_names).to include(:minutes_book)
    end

    it "accepts a school class only on a class council" do
      school_class = create(:school_class, school: school)

      expect(build(:minutes_entry, school: school, kind: "class_council", school_class: school_class)).to be_valid
      expect(build(:minutes_entry, school: school, kind: "meeting", school_class: school_class)).not_to be_valid
    end

    it "rejects a school class of another school" do
      entry = build(:minutes_entry, school: school, kind: "class_council", school_class: create(:school_class))

      expect(entry).not_to be_valid
    end
  end

  describe "body sanitization" do
    it "keeps the allowlisted tags and drops everything else" do
      entry = create(
        :minutes_entry, school: school,
                        body: '<h2>Pauta</h2><p onclick="x()">Texto <strong>forte</strong> <em>ênfase</em><br></p>' \
                              '<ul><li>um</li></ul><script>alert(1)</script><a href="http://x.test">link</a>'
      )

      expect(entry.body).to include("<h2>Pauta</h2>", "<strong>forte</strong>", "<em>ênfase</em>", "<ul><li>um</li></ul>")
      expect(entry.body).not_to match(/script|onclick|href|alert/)
    end

    it "stores a blank body as nil" do
      expect(create(:minutes_entry, school: school, body: "   ").body).to be_nil
    end
  end

  describe "lifecycle" do
    let(:entry) { create(:minutes_entry, school: school) }

    it "moves draft to pending_signature to signed, stamping signed_at" do
      expect(entry.request_signature!).to be(true)
      expect(entry.mark_signed!).to be(true)
      expect(entry).to be_signed
      expect(entry.signed_at).to be_present
    end

    it "cancels from draft or pending_signature, stamping cancelled_at" do
      entry.request_signature!
      expect(entry.cancel!).to be(true)
      expect(entry.cancelled_at).to be_present
      expect(create(:minutes_entry, school: school).cancel!).to be(true)
    end

    it "does not leave signed or cancelled" do
      signed = create(:minutes_entry, :signed, school: school)
      cancelled = create(:minutes_entry, :cancelled, school: school)

      expect(signed.may_cancel?).to be(false)
      expect(signed).not_to be_editable
      expect(cancelled.may_request_signature?).to be(false)
    end

    it "cannot be signed straight from draft" do
      expect(entry.may_mark_signed?).to be(false)
    end

    it "refuses direct status assignment" do
      expect { entry.status = "signed" }.to raise_error(AASM::NoDirectAssignmentError)
    end
  end

  describe "search scopes" do
    let!(:jose_entry) { create(:minutes_entry, school: school) }
    let!(:other_entry) { create(:minutes_entry, school: school) }

    before do
      create(:minutes_participant, school: school, minutes_entry: jose_entry, name: "José da Conceição")
      create(:minutes_participant, school: school, minutes_entry: other_entry, name: "Maria Souza")
    end

    it "matches a participant name ignoring case and accents" do
      expect(described_class.with_participant_named("jose")).to contain_exactly(jose_entry)
      expect(described_class.with_participant_named("CONCEICAO")).to contain_exactly(jose_entry)
      expect(described_class.with_participant_named("souza")).to contain_exactly(other_entry)
    end

    it "treats LIKE wildcards literally" do
      expect(described_class.with_participant_named("%")).to be_empty
    end

    it "filters by the book's year" do
      old = create(:minutes_entry, school: school, minutes_book: create(:minutes_book, school: school, year: 2024))

      expect(described_class.for_year(2024)).to contain_exactly(old)
    end
  end
end
