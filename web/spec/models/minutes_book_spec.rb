# frozen_string_literal: true

require "rails_helper"

RSpec.describe MinutesBook, type: :model do
  let(:school) { create(:school) }

  it "is valid with a name and a year" do
    expect(build(:minutes_book, school: school)).to be_valid
  end

  it "requires a name and a plausible year" do
    book = build(:minutes_book, school: school, name: "  ", year: 1800)

    expect(book).not_to be_valid
    expect(book.errors.attribute_names).to include(:name, :year)
  end

  it "squishes the name before validating" do
    book = create(:minutes_book, school: school, name: "  Livro   Ata  ")

    expect(book.name).to eq("Livro Ata")
  end

  describe "name uniqueness" do
    before { create(:minutes_book, school: school, name: "Livro A", year: 2026) }

    it "rejects the same name in the same school and year" do
      duplicate = build(:minutes_book, school: school, name: "Livro A", year: 2026)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors).to be_of_kind(:name, :taken)
    end

    it "allows the name in another year or another school" do
      expect(build(:minutes_book, school: school, name: "Livro A", year: 2027)).to be_valid
      expect(build(:minutes_book, name: "Livro A", year: 2026)).to be_valid
    end

    it "frees the name once the book is discarded" do
      MinutesBook.find_by!(name: "Livro A").discard

      expect(build(:minutes_book, school: school, name: "Livro A", year: 2026)).to be_valid
    end

    it "is enforced by the database for kept books" do
      duplicate = build(:minutes_book, school: school, name: "Livro A", year: 2026)

      expect { duplicate.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end
  end

  it "refuses to be destroyed while it holds entries" do
    book = create(:minutes_book, school: school)
    create(:minutes_entry, school: school, minutes_book: book)

    expect(book.destroy).to be(false)
  end
end
