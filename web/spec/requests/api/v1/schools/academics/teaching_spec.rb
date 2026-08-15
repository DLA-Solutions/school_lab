# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Academics: teachers, classes and subjects", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:base) { "/api/v1/schools/#{school.id}/academics" }

  describe "subjects" do
    it "creates a subject" do
      post "#{base}/subjects", params: { subject: { name: "Matemática" } }, headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "name")).to eq("Matemática")
    end

    it "rejects a duplicate name in the same school" do
      create(:subject, school: school, name: "Matemática")

      post "#{base}/subjects", params: { subject: { name: "Matemática" } }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("name")
    end

    it "allows the same name in another school" do
      create(:subject, school: create(:school), name: "Matemática")

      post "#{base}/subjects", params: { subject: { name: "Matemática" } }, headers: headers, as: :json

      expect(response).to have_http_status(:created)
    end
  end

  describe "school classes" do
    it "creates a cohort" do
      post "#{base}/school_classes",
           params: { school_class: { name: "A", grade_level: "fundamental_i_5",
                                     shift: "vespertino", year: 2026 } },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["data"]).to include(
        "name" => "A", "grade_level" => "fundamental_i_5", "shift" => "vespertino", "year" => 2026
      )
    end

    # A cohort that says nothing about when it is taught defaults to the morning, and is called "A".
    it "defaults to the morning and to A" do
      post "#{base}/school_classes",
           params: { school_class: { grade_level: "fundamental_i_5", year: 2026 } },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["data"]).to include("name" => "A", "shift" => "matutino")
    end

    it "discards an empty cohort" do
      school_class = create(:school_class, school: school)

      delete "#{base}/school_classes/#{school_class.id}", headers: headers

      expect(response).to have_http_status(:no_content)
      expect(school_class.reload).to be_discarded
    end

    # Deleting nullifies `school_class_id` on everyone in it, and a student without one fails
    # their own validation — the children would be left unattached.
    it "refuses to delete a cohort that still has students" do
      school_class = create(:school_class, school: school)
      create(:student, school: school, school_class: school_class)

      delete "#{base}/school_classes/#{school_class.id}", headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(school_class.reload).to be_kept
    end

    describe "narrowing the listing" do
      before do
        create(:school_class, school: school, name: "A", grade_level: "fundamental_i_5",
                              shift: "matutino", year: 2026)
        create(:school_class, school: school, name: "B", grade_level: "fundamental_i_5",
                              shift: "vespertino", year: 2026)
        create(:school_class, school: school, name: "A", grade_level: "fundamental_ii_7",
                              shift: "matutino", year: 2025)
      end

      def listed(query)
        get "#{base}/school_classes?#{query}", headers: headers
        response.parsed_body["data"].map { |row| [ row["grade_level"], row["shift"], row["name"] ] }
      end

      it "finds a cohort by its letter, in any case" do
        expect(listed("q=b")).to eq([ [ "fundamental_i_5", "vespertino", "B" ] ])
      end

      it "narrows by grade" do
        expect(listed("grade_level=fundamental_ii_7").map(&:first).uniq)
          .to eq([ "fundamental_ii_7" ])
      end

      it "narrows by shift" do
        expect(listed("shift=vespertino").map { |row| row[1] }.uniq).to eq([ "vespertino" ])
      end

      it "narrows by year" do
        expect(listed("year=2025").size).to eq(1)
      end

      it "combines the filters" do
        expect(listed("year=2026&shift=matutino&grade_level=fundamental_i_5&q=a"))
          .to eq([ [ "fundamental_i_5", "matutino", "A" ] ])
      end
    end

    it "rejects a second cohort spelled in another case" do
      create(:school_class, school: school, name: "A", grade_level: "fundamental_i_5",
                            shift: "matutino", year: 2026)

      post "#{base}/school_classes",
           params: { school_class: { name: "a", grade_level: "fundamental_i_5",
                                     shift: "matutino", year: 2026 } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("name")
    end

    it "rejects a shift outside the list" do
      post "#{base}/school_classes",
           params: { school_class: { name: "A", grade_level: "fundamental_i_5",
                                     shift: "noturno", year: 2026 } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("shift")
    end

    # The same letter in the same grade and year is a different group in the other shift.
    it "allows the same name in the other shift" do
      create(:school_class, school: school, name: "A",
                            grade_level: "fundamental_i_5", shift: "matutino", year: 2026)

      post "#{base}/school_classes",
           params: { school_class: { name: "A", grade_level: "fundamental_i_5",
                                     shift: "vespertino", year: 2026 } },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
    end

    it "rejects a grade outside the list" do
      post "#{base}/school_classes",
           params: { school_class: { name: "A", grade_level: "ensino_medio_1", year: 2026 } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("grade_level")
    end

    it "reports how many students are enrolled" do
      school_class = create(:school_class, school: school)
      create_list(:student, 2, school: school, school_class: school_class)

      get "#{base}/school_classes", headers: headers

      row = response.parsed_body["data"].find { |c| c["id"] == school_class.id }
      expect(row["student_count"]).to eq(2)
    end
  end

  describe "teachers" do
    let(:school_class) { create(:school_class, school: school, grade_level: "fundamental_i_5", name: "A") }
    let(:other_class) { create(:school_class, school: school, grade_level: "fundamental_ii_7", name: "B") }
    let(:maths) { create(:subject, school: school, name: "Matemática") }
    let(:science) { create(:subject, school: school, name: "Ciências") }

    it "creates a teacher with a validated CPF" do
      post "#{base}/teachers",
           params: {
             teacher: { name: "Carla", cpf: "529.982.247-25", email: "carla@example.com",
                        job_position_id: create(:job_position, school: school).id }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "cpf")).to eq("52998224725")
    end

    it "rejects an invalid CPF" do
      post "#{base}/teachers",
           params: {
             teacher: { name: "Carla", cpf: "111.111.111-11", email: "c@example.com",
                        job_position_id: create(:job_position, school: school).id }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("cpf")
    end

    describe "assignments" do
      let(:teacher) { create(:teacher, school: school) }

      it "attaches the teacher to one subject of one class" do
        post "#{base}/teachers/#{teacher.id}/teaching_assignments",
             params: { teaching_assignment: { school_class_id: school_class.id, subject_id: maths.id } },
             headers: headers, as: :json

        expect(response).to have_http_status(:created)

        classes = response.parsed_body.dig("data", "classes")
        expect(classes.length).to eq(1)
        expect(classes.first["subjects"].map { |s| s["name"] }).to eq([ "Matemática" ])
      end

      it "refuses the same subject twice in the same class" do
        create(:teaching_assignment, school: school, teacher: teacher,
                                     school_class: school_class, subject: maths)

        post "#{base}/teachers/#{teacher.id}/teaching_assignments",
             params: { teaching_assignment: { school_class_id: school_class.id, subject_id: maths.id } },
             headers: headers, as: :json

        expect(response).to have_http_status(:unprocessable_content)
      end

      it "refuses a class from another school" do
        foreign = create(:school_class, school: create(:school))

        post "#{base}/teachers/#{teacher.id}/teaching_assignments",
             params: { teaching_assignment: { school_class_id: foreign.id, subject_id: maths.id } },
             headers: headers, as: :json

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body.dig("error", "details")).to have_key("school_class")
      end

      # The listing must answer "which classes, and which subjects in each" in one row.
      it "groups a teacher's subjects under each class they teach" do
        create(:teaching_assignment, school: school, teacher: teacher,
                                     school_class: school_class, subject: maths)
        create(:teaching_assignment, school: school, teacher: teacher,
                                     school_class: school_class, subject: science)
        create(:teaching_assignment, school: school, teacher: teacher,
                                     school_class: other_class, subject: maths)

        get "#{base}/teachers", headers: headers

        row = response.parsed_body["data"].find { |t| t["id"] == teacher.id }
        by_class = row["classes"].to_h { |c| [ c["id"], c["subjects"].map { |s| s["name"] } ] }

        expect(by_class[school_class.id]).to match_array(%w[Matemática Ciências])
        expect(by_class[other_class.id]).to eq([ "Matemática" ])
      end

      it "narrows the listing to the teachers of one class" do
        other_teacher = create(:teacher, school: school)
        create(:teaching_assignment, school: school, teacher: teacher,
                                     school_class: school_class, subject: maths)
        create(:teaching_assignment, school: school, teacher: other_teacher,
                                     school_class: other_class, subject: maths)

        get "#{base}/teachers", params: { school_class_id: school_class.id }, headers: headers

        expect(response.parsed_body["data"].map { |t| t["id"] }).to eq([ teacher.id ])
      end

      it "drops a removed assignment from the listing" do
        assignment = create(:teaching_assignment, school: school, teacher: teacher,
                                                  school_class: school_class, subject: maths)

        delete "#{base}/teaching_assignments/#{assignment.id}", headers: headers
        expect(response).to have_http_status(:no_content)

        get "#{base}/teachers", headers: headers
        row = response.parsed_body["data"].find { |t| t["id"] == teacher.id }
        expect(row["classes"]).to be_empty
      end
    end
  end

  it "denies a guardian access to the academics register" do
    guardian_user = create(:user)
    create(:membership, user: guardian_user, school: school, role: "guardian")

    get "#{base}/teachers", headers: auth_headers_for(guardian_user)

    expect(response).to have_http_status(:forbidden)
  end

  # "Aulas": every lesson in the school as one row each — a teacher, a subject, and the cohort.
  describe "listing the lessons" do
    let!(:fifth_a) do
      create(:school_class, school: school, name: "A", grade_level: "fundamental_i_5",
                            shift: "matutino", year: 2026)
    end
    let!(:seventh_b) do
      create(:school_class, school: school, name: "B", grade_level: "fundamental_ii_7",
                            shift: "vespertino", year: 2025)
    end
    let!(:maths) { create(:subject, school: school, name: "Matemática") }
    let!(:science) { create(:subject, school: school, name: "Ciências") }
    let!(:carla) { create(:teacher, school: school, name: "Carla Nogueira") }
    let!(:bruno) { create(:teacher, school: school, name: "Bruno Alves") }

    before do
      create(:teaching_assignment, school: school, teacher: carla, school_class: fifth_a,
                                   subject: maths)
      create(:teaching_assignment, school: school, teacher: carla, school_class: fifth_a,
                                   subject: science)
      create(:teaching_assignment, school: school, teacher: bruno, school_class: seventh_b,
                                   subject: maths)
    end

    def rows(query = "")
      get "#{base}/teaching_assignments?#{query}", headers: headers
      response.parsed_body["data"]
    end

    it "gives a row per teacher, subject and cohort" do
      expect(rows.size).to eq(3)
      expect(rows.first).to include("teacher_name", "subject_name", "school_class")
    end

    # The letter alone repeats in every grade and both shifts, so the row names the cohort in full.
    it "names the cohort the way the rest of the product does" do
      row = rows.find { |r| r["subject_name"] == "Ciências" }

      expect(row.dig("school_class", "label"))
        .to eq("Ensino Fundamental I — 5º ano A · Matutino — 2026")
    end

    it "finds every lesson of one teacher by name" do
      expect(rows("q=carla").map { |r| r["subject_name"] }).to match_array(%w[Matemática Ciências])
    end

    it "finds a subject by name, across teachers" do
      expect(rows("q=#{CGI.escape('Matemática')}").map { |r| r["teacher_name"] })
        .to match_array([ "Carla Nogueira", "Bruno Alves" ])
    end

    it "narrows to one cohort" do
      expect(rows("school_class_id=#{seventh_b.id}").map { |r| r["teacher_name"] })
        .to eq([ "Bruno Alves" ])
    end

    it "narrows to one subject" do
      expect(rows("subject_id=#{science.id}").size).to eq(1)
    end

    it "narrows to one year" do
      expect(rows("year=2025").map { |r| r["teacher_name"] }).to eq([ "Bruno Alves" ])
    end

    it "leaves a removed assignment out" do
      TeachingAssignment.last.discard

      expect(rows.size).to eq(2)
    end
  end
end
