# frozen_string_literal: true

require "rails_helper"

# The mark sheet: the students of one class down, the year's periods across. Read whole and
# written a cell at a time, which is what lets the screen save each mark as it is typed.
RSpec.describe "Academics: the mark sheet", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:base) { "/api/v1/schools/#{school.id}/academics" }

  let(:school_class) { create(:school_class, school: school, year: 2026) }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
  let!(:ana) { create(:student, school: school, school_class: school_class, name: "Ana") }
  let!(:pedro) { create(:student, school: school, school_class: school_class, name: "Pedro") }

  let(:school_year) do
    create(:school_year, school: school, name: "2026", starts_on: Date.new(2026, 2, 1),
                         ends_on: Date.new(2026, 12, 15))
  end
  let!(:first_period) do
    create(:academic_period, school: school, school_year: school_year, name: "1º bimestre",
                             sequence: 1, starts_on: Date.new(2026, 2, 1),
                             ends_on: Date.new(2026, 4, 30))
  end
  let!(:second_period) do
    create(:academic_period, school: school, school_year: school_year, name: "2º bimestre",
                             sequence: 2, starts_on: Date.new(2026, 5, 1),
                             ends_on: Date.new(2026, 7, 15))
  end

  def sheet
    get "#{base}/grades?school_class_id=#{school_class.id}&subject_id=#{maths.id}", headers: headers
    response.parsed_body["data"]
  end

  def write(student:, period:, score:, as: headers)
    put "#{base}/grades/cell",
        params: { school_class_id: school_class.id, subject_id: maths.id,
                  grade: { student_id: student.id, academic_period_id: period.id, score: score } },
        headers: as, as: :json
  end

  describe "reading the sheet" do
    it "gives the roll down and the periods across" do
      expect(sheet["students"].map { |row| row["name"] }).to eq(%w[Ana Pedro])
      expect(sheet["periods"].map { |row| row["name"] }).to eq([ "1º bimestre", "2º bimestre" ])
    end

    # The empty cells are the point: a teacher needs to see which marks are still missing, and a
    # collection of the marks that exist could not show that.
    it "reports a cell with no mark as empty rather than leaving it out" do
      expect(sheet["students"].first["scores"].values).to eq([ nil, nil ])
    end

    it "carries the marks already given" do
      write(student: ana, period: first_period, score: 8.5)

      row = sheet["students"].find { |student| student["name"] == "Ana" }
      expect(row["scores"][first_period.id.to_s]).to eq(8.5)
    end

    # A closed period is the school's record of what was awarded; the grid greys it out rather
    # than letting a teacher type into something the API will refuse.
    it "says which periods are closed" do
      second_period.update!(closure_status: "closed")

      expect(sheet["periods"].map { |row| row["closed"] }).to eq([ false, true ])
    end
  end

  describe "writing a cell" do
    it "records the mark" do
      write(student: ana, period: first_period, score: 9)

      expect(response).to have_http_status(:ok)
      expect(Grade.kept.find_by(student: ana, academic_period: first_period).score).to eq(9)
    end

    # Entering the same cell twice is a correction, not a second mark.
    it "corrects rather than duplicating" do
      write(student: ana, period: first_period, score: 6)
      write(student: ana, period: first_period, score: 7)

      expect(Grade.kept.where(student: ana, academic_period: first_period).count).to eq(1)
      expect(Grade.kept.find_by(student: ana).score).to eq(7)
    end

    # A teacher who clears a mistyped mark must not be left with the old value, and an empty cell
    # is not a zero.
    it "stores a cleared cell as empty" do
      write(student: ana, period: first_period, score: 6)
      write(student: ana, period: first_period, score: nil)

      expect(Grade.kept.find_by(student: ana).score).to be_nil
    end

    it "refuses a mark outside the scale" do
      write(student: ana, period: first_period, score: 11)

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("score")
    end

    it "refuses to mark a closed period" do
      first_period.update!(closure_status: "closed")

      write(student: ana, period: first_period, score: 8)

      expect(response).to have_http_status(:unprocessable_content)
      expect(Grade.kept.count).to eq(0)
    end
  end

  # A teacher marks the lessons they are assigned to and no others.
  describe "a teacher's own lessons" do
    let(:teacher_user) { create(:user, email: "carla@example.com") }
    let!(:teacher_membership) do
      create(:membership, user: teacher_user, school: school, role: "teacher")
    end
    let!(:teacher) { create(:teacher, school: school, email: "carla@example.com") }
    let(:teacher_headers) { auth_headers_for(teacher_user) }

    before do
      create(:staff_profile, membership: teacher_membership, school: school) if defined?(StaffProfile)
    end

    it "refuses a class and subject they are not assigned to" do
      get "#{base}/grades?school_class_id=#{school_class.id}&subject_id=#{maths.id}",
          headers: teacher_headers

      expect(response).to have_http_status(:forbidden)
    end

    it "refuses to write into a lesson that is not theirs" do
      write(student: ana, period: first_period, score: 8, as: teacher_headers)

      expect(response).to have_http_status(:forbidden)
      expect(Grade.kept.count).to eq(0)
    end
  end
end
