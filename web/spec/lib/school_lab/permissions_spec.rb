# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Permissions do
  EXPECTED_CATALOG_KEYS = %w[
    manage_school_settings
    manage_billing
    manage_people
    manage_enrollment
    manage_documents
    approve_lesson_plans
    moderate_messages
    teach
    view_billing_summary
  ].freeze

  # Appendix matrix from permissions PRD — single source for template specs.
  EXPECTED_TEMPLATE_PERMISSIONS = {
    "director" => [
      { key: "manage_school_settings", scope_kind: "full" },
      { key: "manage_billing", scope_kind: "full" },
      { key: "manage_people", scope_kind: "full" },
      { key: "manage_enrollment", scope_kind: "full" },
      { key: "manage_documents", scope_kind: "full" },
      { key: "approve_lesson_plans", scope_kind: "full" },
      { key: "moderate_messages", scope_kind: "full" },
      { key: "view_billing_summary", scope_kind: "full" }
    ],
    "secretary" => [
      { key: "manage_people", scope_kind: "full" },
      { key: "manage_enrollment", scope_kind: "full" },
      { key: "manage_documents", scope_kind: "full" }
    ],
    "coordination" => [
      { key: "manage_people", scope_kind: "partial" },
      { key: "approve_lesson_plans", scope_kind: "full" },
      { key: "moderate_messages", scope_kind: "full" },
      { key: "teach", scope_kind: "full", requires_also_teaches: true }
    ],
    "teacher" => [
      { key: "teach", scope_kind: "full" }
    ]
  }.freeze

  describe "CATALOG" do
    it "lists exactly the nine staff permission keys" do
      expect(described_class::CATALOG.keys).to match_array(EXPECTED_CATALOG_KEYS)
    end

    it "is frozen" do
      expect(described_class::CATALOG).to be_frozen
    end

    it "freezes each entry and scope_kinds array" do
      described_class::CATALOG.each_value do |metadata|
        expect(metadata).to be_frozen
        expect(metadata[:scope_kinds]).to be_frozen
      end
    end

    it "documents teach coordination guard on staff role" do
      expect(described_class::CATALOG["teach"]).to include(requires_also_teaches_when_role: "staff")
    end
  end

  describe "SYSTEM_TEMPLATES" do
    it "defines the four system templates" do
      expect(described_class::SYSTEM_TEMPLATES.keys).to contain_exactly(
        "director", "secretary", "coordination", "teacher"
      )
    end

    it "is frozen" do
      expect(described_class::SYSTEM_TEMPLATES).to be_frozen
    end

    EXPECTED_TEMPLATE_PERMISSIONS.each do |template_key, expected_permissions|
      describe template_key do
        let(:template) { described_class::SYSTEM_TEMPLATES.fetch(template_key) }

        it "matches the PRD appendix permission matrix" do
          normalized = template[:permissions].map { |entry| entry.slice(:key, :scope_kind) }
          expected = expected_permissions.map { |entry| entry.slice(:key, :scope_kind) }

          expect(normalized).to match_array(expected)
        end

        if template_key == "coordination"
          it "flags teach as conditional on also_teaches" do
            teach_entry = template[:permissions].find { |entry| entry[:key] == "teach" }

            expect(teach_entry).to include(requires_also_teaches: true)
          end
        end
      end
    end

    it "uses pt-BR default names aligned with schema sample" do
      expect(described_class::SYSTEM_TEMPLATES.values.pluck(:default_name)).to contain_exactly(
        "Direção", "Secretaria", "Coordenação", "Professor"
      )
    end
  end

  describe ".known_key?" do
    it "returns true for a valid permission key" do
      expect(described_class.known_key?("manage_people")).to be(true)
    end

    it "returns true when given a symbol" do
      expect(described_class.known_key?(:teach)).to be(true)
    end

    it "returns false for an unknown key" do
      expect(described_class.known_key?("foo")).to be(false)
    end
  end

  describe ".staff_keys" do
    it "returns all catalog keys" do
      expect(described_class.staff_keys).to match_array(EXPECTED_CATALOG_KEYS)
    end
  end

  describe ".system_template_keys" do
    it "returns all system template keys" do
      expect(described_class.system_template_keys).to contain_exactly(
        "director", "secretary", "coordination", "teacher"
      )
    end
  end
end
