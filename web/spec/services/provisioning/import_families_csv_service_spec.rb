# frozen_string_literal: true

require "rails_helper"

RSpec.describe Provisioning::ImportFamiliesCsvService do
  subject(:result) do
    described_class.call(
      school: school,
      actor: backoffice_user,
      file_io: StringIO.new(csv_content),
      dry_run: dry_run
    )
  end

  let(:school) { create(:school, :provisioning) }
  let(:backoffice_user) { create(:user) }
  let!(:school_class) { create(:school_class, school: school, name: "A") }
  let(:dry_run) { true }

  let(:csv_content) do
    <<~CSV
      student_name,student_birth_date,student_rg,school_class_name,guardian_name,guardian_email,guardian_phone,guardian_relationship,guardian_zip_code,guardian_street,guardian_number,guardian_neighborhood,guardian_city,guardian_state,student_cpf,guardian_cpf
      Ana Silva,2015-03-10,MG-00000001,A,Maria Silva,maria@example.com,+55 11 99999-0001,mother,01310100,Avenida Paulista,1000,Bela Vista,São Paulo,SP,52998224725,12345678909
    CSV
  end

  describe "dry run preview" do
    it "returns a validation summary without persisting people records" do
      expect { result }
        .to change(ProvisioningImport, :count).by(1)
        .and change(Student, :count).by(0)
        .and change(Guardian, :count).by(0)

      expect(result).to be_success
      expect(result.data.fetch(:import).status).to eq("previewed")
      expect(result.data.fetch(:summary)).to include(
        valid_rows: 1,
        students_to_create: 1,
        guardians_to_create: 1,
        links_to_create: 1
      )
    end
  end

  describe "commit import" do
    let(:dry_run) { false }

    it "creates guardians, students, links, and an audit row" do
      expect { result }
        .to change(ProvisioningImport, :count).by(1)
        .and change(Student.kept, :count).by(1)
        .and change(Guardian.kept, :count).by(1)
        .and change(StudentGuardian.kept, :count).by(1)

      import = result.data.fetch(:import)
      expect(import.status).to eq("committed")
      expect(import.committed_at).to be_present

      student = school.students.kept.last
      expect(student.name).to eq("Ana Silva")
      expect(student.student_guardians.kept.first.relationship).to eq("mother")
    end

    it "reuses an existing student when a second guardian row is imported" do
      described_class.call(
        school: school,
        actor: backoffice_user,
        file_io: StringIO.new(csv_content),
        dry_run: false
      )

      second_row = csv_content
                   .sub("mother", "father")
                   .sub("maria@example.com", "joao@example.com")
                   .sub("12345678909", "15852119075")
      second_result = described_class.call(
        school: school,
        actor: backoffice_user,
        file_io: StringIO.new(second_row),
        dry_run: false
      )

      expect(second_result).to be_success
      expect(school.students.kept.count).to eq(1)
      expect(school.guardians.kept.count).to eq(2)
      expect(school.student_guardians.kept.count).to eq(2)
    end
  end

  describe "validation failures" do
    let(:csv_content) do
      <<~CSV
        student_name,student_birth_date,student_rg,school_class_name,guardian_name,guardian_email,guardian_phone,guardian_relationship,guardian_zip_code,guardian_street,guardian_number,guardian_neighborhood,guardian_city,guardian_state
        ,2015-03-10,MG-00000001,Missing Class,Maria Silva,maria@example.com,+55 11 99999-0001,mother,01310100,Avenida Paulista,1000,Bela Vista,São Paulo,SP
      CSV
    end

    it "returns import_validation_failed and stores a failed audit row" do
      expect { result }
        .to change(ProvisioningImport, :count).by(1)
        .and change(Student, :count).by(0)

      expect(result).to be_failure
      expect(result.error_code).to eq(:import_validation_failed)
      expect(result.details.dig(:error_report, :rows)).to be_present

      expect(ProvisioningImport.last.status).to eq("failed")
    end
  end
end
