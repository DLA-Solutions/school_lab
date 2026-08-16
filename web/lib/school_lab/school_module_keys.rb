# frozen_string_literal: true

module SchoolLab
  module SchoolModuleKeys
    CATALOG = {
      "communication" => {
        domain: "communication",
        description: "Messaging and announcements"
      }.freeze,
      "academic" => {
        domain: "academic",
        description: "Classes, attendance, and grades"
      }.freeze,
      "billing" => {
        domain: "billing",
        description: "Charges, boletos, and collections"
      }.freeze,
      "documents" => {
        domain: "documents",
        description: "Digital archive and signatures"
      }.freeze
    }.freeze

    module_function

    def known_key?(key)
      CATALOG.key?(key.to_s)
    end

    def keys
      CATALOG.keys
    end
  end
end
