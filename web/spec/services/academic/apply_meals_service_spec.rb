# frozen_string_literal: true

require "rails_helper"

RSpec.describe Academic::ApplyMealsService do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let(:teacher) { create(:teacher, school: school, email: user.email) }
  let(:membership) { create(:membership, user: user, school: school, role: "teacher") }
  let(:school_class) { create(:school_class, school: school, grade_level: "infantil_1") }

  it "fills only a null meal and leaves an existing value and draft status alone" do
    already = create(:student, school: school, school_class: school_class)
    missing = create(:student, school: school, school_class: school_class)
    date = DailyRoutine.today

    Academic::UpsertDailyRoutineService.call(
      school: school,
      teacher: teacher,
      student: already,
      attributes: { date: date, meal_lunch: "regular" },
      uploaded_by: membership
    )

    result = nil
    expect do
      result = described_class.call(
        school: school,
        teacher: teacher,
        school_class: school_class,
        date: date,
        field: "meal_lunch",
        value: "great"
      )
    end.not_to change(Message, :count)

    expect(result).to be_success
    routines = result.data[:routines]
    expect(routines.map(&:student_id)).to eq([ already.id, missing.id ].sort)

    by_student = routines.index_by(&:student_id)
    expect(by_student[already.id].meal_lunch).to eq("regular")
    expect(by_student[already.id].status).to eq("draft")
    expect(by_student[missing.id].meal_lunch).to eq("great")
    expect(by_student[missing.id].meal_breakfast).to be_nil
    expect(by_student[missing.id].narrative).to be_nil
    expect(by_student[missing.id].status).to eq("draft")
    expect(by_student[missing.id].author).to eq(teacher)
  end
end
