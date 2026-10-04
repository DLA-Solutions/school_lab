# frozen_string_literal: true

require "rails_helper"

# What a school's lesson plans list returns to each actor, and how the filters narrow it
# (UC-LP03 teacher-scoped, UC-LP04 staff-scoped, BR-LP06). `teacher_id` is a plain additional
# filter -- it is only meaningful for manage_academic staff, since a teacher-role request's
# policy_scope already excludes every other teacher's plans regardless of the param (AC-LP07's
# third bullet).
RSpec.describe "Lesson plans: listing and filters (UC-LP03/UC-LP04)", type: :request do
  let(:school) { create(:school) }
  let(:base) { "/api/v1/schools/#{school.id}/academics/lesson_plans" }

  let(:school_class) { create(:school_class, school: school, name: "A") }
  let(:other_class) { create(:school_class, school: school, name: "B") }
  let(:maths) { create(:subject, school: school, name: "Matemática") }
  let(:portuguese) { create(:subject, school: school, name: "Português") }

  let(:carla_user) { create(:user, email: "carla@example.com") }
  let!(:carla_membership) { create(:membership, user: carla_user, school: school, role: "teacher") }
  let!(:carla) { create(:teacher, school: school, email: "carla@example.com", name: "Carla Souza") }

  let(:bruno_user) { create(:user, email: "bruno@example.com") }
  let!(:bruno_membership) { create(:membership, user: bruno_user, school: school, role: "teacher") }
  let!(:bruno) { create(:teacher, school: school, email: "bruno@example.com", name: "Bruno Lima") }

  let(:carla_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: maths, teacher: carla)
  end
  let(:bruno_discipline) do
    create(:class_discipline, school: school, school_class: other_class, subject: portuguese, teacher: bruno)
  end

  let!(:carla_plan) do
    create(:lesson_plan, school: school, class_discipline: carla_discipline, date: Date.current)
  end
  let!(:bruno_plan) do
    create(:lesson_plan, school: school, class_discipline: bruno_discipline, date: Date.current)
  end

  def manage_academic_staff
    user = create(:user)
    membership = create(:membership, user: user, school: school, role: "staff")
    template = create(:school_role_template, school: school)
    create(:role_template_permission, school: school, role_template: template, permission_key: "manage_academic")
    create(:staff_profile, membership: membership, school: school, role_template: template)
    user
  end

  describe "the coordination list (UC-LP04)" do
    it "returns every teacher's plans for manage_academic staff" do
      get base, headers: auth_headers_for(manage_academic_staff)

      expect(response).to have_http_status(:ok)
      ids = response.parsed_body["data"].pluck("id")
      expect(ids).to contain_exactly(carla_plan.id, bruno_plan.id)
    end

    # AC-LP07
    it "narrows by teacher_id alone" do
      get base, params: { teacher_id: carla.id }, headers: auth_headers_for(manage_academic_staff)

      expect(response).to have_http_status(:ok)
      ids = response.parsed_body["data"].pluck("id")
      expect(ids).to eq([ carla_plan.id ])
    end

    # AC-LP07 -- teacher_id combined with subject_id and school_class_id.
    it "combines teacher_id with subject_id and school_class_id" do
      staff_headers = auth_headers_for(manage_academic_staff)

      get base, params: { teacher_id: carla.id, subject_id: maths.id, school_class_id: school_class.id },
                headers: staff_headers
      expect(response.parsed_body["data"].pluck("id")).to eq([ carla_plan.id ])

      get base, params: { teacher_id: carla.id, subject_id: portuguese.id }, headers: staff_headers
      expect(response.parsed_body["data"]).to be_empty
    end

    # AC-LP07 -- teacher_id combined with a from/to date range.
    it "combines teacher_id with a from/to date range" do
      create(:lesson_plan, school: school, class_discipline: carla_discipline, date: Date.current + 10.days)

      get base, params: { teacher_id: carla.id, from: Date.current, to: Date.current },
                headers: auth_headers_for(manage_academic_staff)

      expect(response.parsed_body["data"].pluck("id")).to eq([ carla_plan.id ])
    end

    # teacher_id pointing at a teacher with no plans narrows to nothing, not an error.
    it "returns an empty list for a teacher_id with no plans" do
      nobody = create(:teacher, school: school, name: "Sem Turma")

      get base, params: { teacher_id: nobody.id }, headers: auth_headers_for(manage_academic_staff)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"]).to be_empty
    end

    it "exposes teacher_id, teacher_name, subject_name, and school_class_name for the admin table" do
      get base, params: { teacher_id: carla.id }, headers: auth_headers_for(manage_academic_staff)

      row = response.parsed_body["data"].first
      expect(row["teacher_id"]).to eq(carla.id)
      expect(row["teacher_name"]).to eq("Carla Souza")
      expect(row["subject_name"]).to eq("Matemática")
      expect(row["school_class_name"]).to eq("A")
    end
  end

  describe "a teacher's own scope (UC-LP03, BR-LP02/BR-LP06)" do
    # AC-LP07 third bullet: policy_scope wins regardless of the filter param.
    it "ignores a teacher_id filter pointing at another teacher -- still only their own plans" do
      get base, params: { teacher_id: bruno.id }, headers: auth_headers_for(carla_user)

      expect(response).to have_http_status(:ok)
      ids = response.parsed_body["data"].pluck("id")
      expect(ids).to eq([ carla_plan.id ])
    end

    it "returns only the requesting teacher's own plans with no filter" do
      get base, headers: auth_headers_for(carla_user)

      ids = response.parsed_body["data"].pluck("id")
      expect(ids).to eq([ carla_plan.id ])
    end
  end

  it "denies an unauthenticated request with 401" do
    get base

    expect(response).to have_http_status(:unauthorized)
  end
end
