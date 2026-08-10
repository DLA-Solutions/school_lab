# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Searching guardians and students by name or CPF", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }

  # 123.456.789-09 and 529.982.247-25 — real documents, stored as bare digits.
  let!(:maria) { create(:guardian, school: school, name: "Maria Silva", cpf: "12345678909") }
  let!(:joao) { create(:guardian, school: school, name: "João Souza", cpf: "52998224725") }

  let(:school_class) { create(:school_class, school: school) }
  let!(:pedro) do
    create(:student, school: school, school_class: school_class,
                     name: "Pedro Silva", cpf: "12345678909")
  end
  let!(:ana) do
    create(:student, school: school, school_class: school_class,
                     name: "Ana Souza", cpf: "52998224725")
  end

  def names_from(path, query)
    get "/api/v1/schools/#{school.id}/people/#{path}", params: query, headers: headers
    response.parsed_body["data"].map { |row| row["name"] }
  end

  shared_examples "a person search" do |path, first, second|
    it "matches part of the name" do
      expect(names_from(path, q: "Silva")).to eq([ first ])
    end

    it "ignores case" do
      expect(names_from(path, q: "silva")).to eq([ first ])
    end

    it "matches an accented name typed in full" do
      expect(names_from(path, q: "Souza")).to eq([ second ])
    end

    # The CPF is stored as digits, so a term punctuated the way people write it has to match.
    it "matches a formatted CPF" do
      expect(names_from(path, q: "123.456.789-09")).to eq([ first ])
    end

    it "matches a bare CPF" do
      expect(names_from(path, q: "12345678909")).to eq([ first ])
    end

    it "matches a partial CPF" do
      expect(names_from(path, q: "529982")).to eq([ second ])
    end

    it "returns everything when the term is blank" do
      expect(names_from(path, q: "")).to match_array([ first, second ])
    end

    it "returns everything when no term is given" do
      expect(names_from(path, {})).to match_array([ first, second ])
    end

    it "returns nothing when nothing matches" do
      expect(names_from(path, q: "Ninguém")).to be_empty
    end

    # `%` and `_` are LIKE wildcards; typed by a user they are literal characters.
    it "treats a wildcard character as literal text" do
      expect(names_from(path, q: "%")).to be_empty
    end

    it "does not leak records from another school" do
      other = create(:school)
      create(:guardian, school: other, name: "Maria Silva", cpf: "15852119075")

      expect(names_from(path, q: "Silva")).to eq([ first ])
    end
  end

  describe "guardians" do
    it_behaves_like "a person search", "guardians", "Maria Silva", "João Souza"

    it "paginates the filtered result rather than the whole list" do
      create_list(:guardian, 3, school: school)

      get "/api/v1/schools/#{school.id}/people/guardians", params: { q: "Silva" }, headers: headers

      expect(response.parsed_body["meta"]["total"]).to eq(1)
    end
  end

  describe "students" do
    it_behaves_like "a person search", "students", "Pedro Silva", "Ana Souza"

    it "combines with the guardian filter" do
      create(:student_guardian, school: school, student: pedro, guardian: maria)

      get "/api/v1/schools/#{school.id}/people/students",
          params: { q: "Silva", guardian_id: maria.id },
          headers: headers

      expect(response.parsed_body["data"].map { |row| row["name"] }).to eq([ "Pedro Silva" ])
    end
  end
end
