# frozen_string_literal: true

require "rails_helper"

RSpec.describe Student do
  %i[name cpf rg birth_date school_class].each do |attribute|
    it "requires #{attribute}" do
      student = build(:student, attribute => nil)

      expect(student).not_to be_valid
      expect(student.errors[attribute]).to be_present
    end
  end

  describe "school_class" do
    it "reads its grade from the cohort rather than carrying one" do
      school_class = create(:school_class, grade_level: "fundamental_ii_7")
      student = create(:student, school: school_class.school, school_class: school_class)

      expect(student.grade_level).to eq("fundamental_ii_7")
    end

    it "refuses a cohort from another school" do
      student = build(:student, school: create(:school), school_class: create(:school_class))

      expect(student).not_to be_valid
      expect(student.errors[:school_class]).to be_present
    end
  end

  describe "guardians" do
    it "exposes the father and mother links separately" do
      student = create(:student)
      mother = create(:guardian, school: student.school)
      create(:student_guardian, school: student.school, student: student,
                                guardian: mother, relationship: "mother")

      expect(student.mother_link.guardian).to eq(mother)
      expect(student.father_link).to be_nil
    end
  end

  describe "cpf" do
    it "stores only the digits" do
      student = create(:student, cpf: "529.982.247-25")

      expect(student.cpf).to eq("52998224725")
      expect(student.formatted_cpf).to eq("529.982.247-25")
    end

    it "rejects check digits that do not match" do
      expect(build(:student, cpf: "123.456.789-00")).not_to be_valid
    end

    it "rejects a second student with the same CPF in the school, however it is formatted" do
      school = create(:school)
      create(:student, school: school, cpf: "52998224725")

      duplicate = build(:student, school: school, cpf: "529.982.247-25")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:cpf]).to be_present
    end

    it "allows the same CPF in a different school" do
      create(:student, school: create(:school), cpf: "52998224725")

      expect(build(:student, school: create(:school), cpf: "52998224725")).to be_valid
    end
  end

  describe "birth_date" do
    it "rejects a date in the future" do
      student = build(:student, birth_date: Date.tomorrow)

      expect(student).not_to be_valid
      expect(student.errors[:birth_date]).to be_present
    end

    it "accepts a date in the past" do
      expect(build(:student, birth_date: 8.years.ago.to_date)).to be_valid
    end
  end
end
