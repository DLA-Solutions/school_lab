# frozen_string_literal: true

module SchoolLab
  module Permissions
    CATALOG = {
      "manage_school_settings" => {
        domain: "school",
        scope_kinds: [ "full" ].freeze
      }.freeze,
      "manage_billing" => {
        domain: "billing",
        scope_kinds: [ "full" ].freeze
      }.freeze,
      "manage_people" => {
        domain: "people",
        scope_kinds: %w[full partial].freeze
      }.freeze,
      "manage_enrollment" => {
        domain: "enrollment",
        scope_kinds: [ "full" ].freeze
      }.freeze,
      "manage_documents" => {
        domain: "documents",
        scope_kinds: %w[full segment].freeze
      }.freeze,
      "manage_academic" => {
        domain: "academic",
        scope_kinds: [ "full" ].freeze
      }.freeze,
      "approve_lesson_plans" => {
        domain: "academic",
        scope_kinds: [ "full" ].freeze
      }.freeze,
      "moderate_messages" => {
        domain: "communication",
        scope_kinds: [ "full" ].freeze
      }.freeze,
      "teach" => {
        domain: "academic",
        scope_kinds: [ "full" ].freeze,
        requires_also_teaches_when_role: "staff"
      }.freeze,
      "view_billing_summary" => {
        domain: "billing",
        scope_kinds: [ "full" ].freeze
      }.freeze
    }.freeze

    SYSTEM_TEMPLATES = {
      "director" => {
        default_name: "Direção",
        permissions: [
          { key: "manage_school_settings", scope_kind: "full" },
          { key: "manage_billing", scope_kind: "full" },
          { key: "manage_people", scope_kind: "full" },
          { key: "manage_enrollment", scope_kind: "full" },
          { key: "manage_documents", scope_kind: "full" },
          { key: "manage_academic", scope_kind: "full" },
          { key: "approve_lesson_plans", scope_kind: "full" },
          { key: "moderate_messages", scope_kind: "full" },
          { key: "view_billing_summary", scope_kind: "full" }
        ].freeze
      }.freeze,
      "secretary" => {
        default_name: "Secretaria",
        permissions: [
          { key: "manage_people", scope_kind: "full" },
          { key: "manage_enrollment", scope_kind: "full" },
          { key: "manage_documents", scope_kind: "full" }
        ].freeze
      }.freeze,
      "coordination" => {
        default_name: "Coordenação",
        permissions: [
          { key: "manage_people", scope_kind: "partial" },
          { key: "manage_academic", scope_kind: "full" },
          { key: "approve_lesson_plans", scope_kind: "full" },
          { key: "moderate_messages", scope_kind: "full" },
          { key: "teach", scope_kind: "full", requires_also_teaches: true }
        ].freeze
      }.freeze,
      "teacher" => {
        default_name: "Professor",
        permissions: [
          { key: "teach", scope_kind: "full" }
        ].freeze
      }.freeze
    }.freeze

    module_function

    def known_key?(key)
      CATALOG.key?(key.to_s)
    end

    def staff_keys
      CATALOG.keys
    end

    def system_template_keys
      SYSTEM_TEMPLATES.keys
    end
  end
end
