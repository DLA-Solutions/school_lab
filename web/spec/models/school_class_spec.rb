# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolClass do
  it "requires a name, a grade and a year" do
    school_class = build(:school_class, name: nil, grade_level: nil, year: nil)

    expect(school_class).not_to be_valid
    expect(school_class.errors[:name]).to be_present
    expect(school_class.errors[:grade_level]).to be_present
    expect(school_class.errors[:year]).to be_present
  end

  describe "grade levels" do
    it "offers every grade the school enrols into" do
      expect(described_class::GRADE_LEVELS).to include(
        "infantil_1", "infantil_5", "fundamental_i_1", "fundamental_i_5",
        "fundamental_ii_6", "fundamental_ii_9"
      )
    end

    # Fundamental I is the 1st to 5th year and Fundamental II the 6th to 9th — they must not
    # overlap, or the same school year would be selectable under two names.
    it "does not offer the same year under two segments" do
      expect(described_class::GRADE_LEVELS.grep(/fundamental/)).to match_array(%w[
        fundamental_i_1 fundamental_i_2 fundamental_i_3 fundamental_i_4 fundamental_i_5
        fundamental_ii_6 fundamental_ii_7 fundamental_ii_8 fundamental_ii_9
      ])
    end

    it "rejects a grade outside the list" do
      expect(build(:school_class, grade_level: "ensino_medio_1")).not_to be_valid
    end
  end

  describe "uniqueness" do
    it "rejects a second cohort with the same grade, name and year in the school" do
      first = create(:school_class, name: "A", grade_level: "fundamental_i_1", year: 2026)
      duplicate = build(:school_class, school: first.school, name: "A",
                                       grade_level: "fundamental_i_1", year: 2026)

      expect(duplicate).not_to be_valid
    end

    it "allows the same name in another year" do
      first = create(:school_class, name: "A", grade_level: "fundamental_i_1", year: 2026)
      next_year = build(:school_class, school: first.school, name: "A",
                                       grade_level: "fundamental_i_1", year: 2027)

      expect(next_year).to be_valid
    end

    it "allows the same name for a different grade" do
      first = create(:school_class, name: "A", grade_level: "fundamental_i_1", year: 2026)
      other_grade = build(:school_class, school: first.school, name: "A",
                                         grade_level: "fundamental_i_2", year: 2026)

      expect(other_grade).to be_valid
    end

    # "A", "a" and " A " name one cohort, not three: either spelling used to open a second roll
    # alongside the first, for the same group of children.
    it "rejects the same name in another case" do
      first = create(:school_class, name: "A", grade_level: "fundamental_i_1",
                                    shift: "matutino", year: 2026)
      lowercase = build(:school_class, school: first.school, name: "a",
                                       grade_level: "fundamental_i_1",
                                       shift: "matutino", year: 2026)

      expect(lowercase).not_to be_valid
      expect(lowercase.errors[:name]).to be_present
    end

    it "rejects the same name padded with spaces" do
      first = create(:school_class, name: "A", grade_level: "fundamental_i_1",
                                    shift: "matutino", year: 2026)
      padded = build(:school_class, school: first.school, name: "  A  ",
                                    grade_level: "fundamental_i_1",
                                    shift: "matutino", year: 2026)

      expect(padded).not_to be_valid
    end

    # The database has to hold the rule too — a validation alone loses a concurrent insert.
    it "refuses a duplicate spelling at the database level" do
      first = create(:school_class, name: "A", grade_level: "fundamental_i_1",
                                    shift: "matutino", year: 2026)
      duplicate = build(:school_class, school: first.school, name: "a",
                                       grade_level: "fundamental_i_1",
                                       shift: "matutino", year: 2026)
      duplicate.name = "a"

      expect { duplicate.save!(validate: false) }
        .to raise_error(ActiveRecord::RecordNotUnique)
    end

    # The morning and the afternoon "5º ano A" are two different groups of students.
    it "allows the same name in the other shift" do
      first = create(:school_class, name: "A", grade_level: "fundamental_i_1",
                                    shift: "matutino", year: 2026)
      afternoon = build(:school_class, school: first.school, name: "A",
                                       grade_level: "fundamental_i_1",
                                       shift: "vespertino", year: 2026)

      expect(afternoon).to be_valid
    end
  end

  describe "the name" do
    it "is stored folded, so the register holds one spelling" do
      school_class = create(:school_class, name: "  b  ")

      expect(school_class.reload.name).to eq("B")
    end
  end

  # Students, teaching assignments and signed contracts all point at a cohort.
  describe "deletion" do
    it "is refused by the policy" do
      expect(SchoolClassPolicy.new(nil, create(:school_class)).destroy?).to be(false)
    end
  end

  describe "shift" do
    it "offers the morning and the afternoon" do
      expect(described_class::SHIFTS).to eq(%w[matutino vespertino])
    end

    it "rejects a shift outside the list" do
      expect(build(:school_class, shift: "noturno")).not_to be_valid
    end

    it "requires one" do
      school_class = build(:school_class, shift: nil)

      expect(school_class).not_to be_valid
      expect(school_class.errors[:shift]).to be_present
    end

    # Most schools open a single group per grade and shift, and it is called "A".
    it "names a new cohort A by default" do
      expect(described_class.new.name).to eq("A")
    end

    it "starts in the morning by default" do
      expect(described_class.new.shift).to eq("matutino")
    end
  end
end
