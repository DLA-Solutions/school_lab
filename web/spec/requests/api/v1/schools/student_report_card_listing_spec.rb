# frozen_string_literal: true

require "rails_helper"

# Reading one child's report cards from the register. The school knows which student and which
# term it is asking about, so the listing answers that rather than making somebody find the batch
# a boletim happened to go out in.
RSpec.describe "One student's published report cards", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }

  let(:school_year) { create(:school_year, school: school) }
  # Terms within a year may not overlap, so each takes its own stretch of the calendar.
  let(:first_term) do
    create(:academic_period, school_year: school_year, name: "1º bimestre", sequence: 1,
                             starts_on: school_year.starts_on,
                             ends_on: school_year.starts_on + 2.months)
  end
  let(:second_term) do
    create(:academic_period, school_year: school_year, name: "2º bimestre", sequence: 2,
                             starts_on: school_year.starts_on + 2.months + 1.day,
                             ends_on: school_year.starts_on + 4.months)
  end

  let(:student) { create(:student, school: school, name: "Mariana Sales") }
  let(:other_student) { create(:student, school: school, name: "Pedro Silva") }

  let(:path) { "/api/v1/schools/#{school.id}/academics/report_card_publications" }

  # A published boletim is a publication with the snapshot that is in force attached to it —
  # `active_snapshot_id` is what the family and the school both read.
  def publish(student:, period:)
    publication = create(:report_card_publication, school: school, student: student,
                                                   academic_period: period)
    snapshot = create(:report_card_snapshot, report_card_publication: publication, school: school)
    publication.update!(active_snapshot: snapshot)
    publication
  end

  it "lists the report cards of the student asked about" do
    mine = publish(student: student, period: first_term)
    publish(student: other_student, period: first_term)

    get path, params: { student_id: student.id }, headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["data"].map { |row| row["publication_id"] }).to eq([ mine.id ])
  end

  it "narrows to one term when asked" do
    publish(student: student, period: first_term)
    second = publish(student: student, period: second_term)

    get path, params: { student_id: student.id, academic_period_id: second_term.id },
              headers: headers

    expect(response.parsed_body["data"].map { |row| row["publication_id"] }).to eq([ second.id ])
  end

  # "All terms" means all terms of the chosen year — not every boletim the child ever had.
  it "keeps to one year when no term is asked for" do
    mine = publish(student: student, period: first_term)
    later_year = create(:school_year, school: school, starts_on: school_year.starts_on + 1.year,
                                      ends_on: school_year.ends_on + 1.year)
    publish(student: student, period: create(:academic_period, school_year: later_year,
                                                               sequence: 1))

    get path, params: { student_id: student.id, school_year_id: school_year.id }, headers: headers

    expect(response.parsed_body["data"].map { |row| row["publication_id"] }).to eq([ mine.id ])
  end

  it "names the term, so a listing reads without a lookup per row" do
    publish(student: student, period: first_term)

    get path, params: { student_id: student.id }, headers: headers

    expect(response.parsed_body["data"].first["academic_period_name"]).to eq("1º bimestre")
  end

  # The marks live in the snapshot; the listing answers "is there a boletim, and where is the PDF".
  it "points at the PDF of the version in force" do
    publication = publish(student: student, period: first_term)

    get path, params: { student_id: student.id }, headers: headers

    row = response.parsed_body["data"].first
    expect(row["snapshot_id"]).to eq(publication.active_snapshot.id)
    expect(row["pdf_url"]).to include("report_card_publications/#{publication.id}/snapshots/")
    expect(row["pdf_url"]).to end_with("/pdf")
  end

  it "says nothing was published rather than failing" do
    get path, params: { student_id: student.id }, headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["data"]).to be_empty
  end

  it "does not reach another school's publications" do
    other_school = create(:school)
    other = create(:student, school: other_school)
    other_year = create(:school_year, school: other_school)
    other_period = create(:academic_period, school_year: other_year, sequence: 1)
    create(:report_card_publication, school: other_school, student: other,
                                     academic_period: other_period)

    get path, headers: headers

    expect(response.parsed_body["data"]).to be_empty
  end

  it "is closed to a guardian reaching the school's own route" do
    guardian_user = create(:user)
    create(:membership, user: guardian_user, school: school, role: "guardian")

    get path, params: { student_id: student.id }, headers: auth_headers_for(guardian_user)

    expect(response).to have_http_status(:forbidden)
  end
end
