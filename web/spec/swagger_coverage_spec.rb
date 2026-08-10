# frozen_string_literal: true

require "rails_helper"

# The OpenAPI document is what someone integrating reads instead of the routing table, so a route
# missing from it is an endpoint nobody outside this repository can find. rswag only writes what a
# spec describes, and most endpoints have no such spec — the document listed 40 operations against
# 130 routes, with nothing to signal the difference between "undocumented" and "does not exist".
#
# `bin/rails swagger:sync` fills the gaps from the routing table; this keeps them filled.
RSpec.describe "OpenAPI coverage" do
  DOCUMENT = Rails.root.join("swagger/v1/swagger.yaml")

  # Rails lists both for the same action, and both are genuinely routable.
  HTTP_METHODS = %w[get post put patch delete].freeze

  def documented_operations
    JSON.parse(DOCUMENT.read).fetch("paths").flat_map do |path, operations|
      operations.keys
                .select { |key| HTTP_METHODS.include?(key.downcase) }
                .map { |method| [ method.upcase, path.gsub(/\{(\w+)\}/) { ":#{Regexp.last_match(1)}" } ] }
    end.to_set
  end

  def api_routes
    Rails.application.routes.routes.filter_map do |route|
      path = route.path.spec.to_s.sub("(.:format)", "")
      next unless path.start_with?("/api/v1/")
      next if route.defaults[:controller].blank?

      route.verb.to_s.gsub(/[$^]/, "").split("|").reject(&:blank?).map { |verb| [ verb, path ] }
    end.flatten(1).to_set
  end

  it "describes every route the API exposes" do
    missing = (api_routes - documented_operations).sort

    expect(missing).to be_empty, lambda {
      "These routes are not in swagger/v1/swagger.yaml. Run `bin/rails swagger:sync`:\n" +
        missing.map { |verb, path| "  #{verb} #{path}" }.join("\n")
    }
  end

  # A path that no longer routes is worse than an undocumented one: it sends an integrator to
  # write code against something that will 404.
  it "describes nothing the API no longer exposes" do
    stale = (documented_operations - api_routes).sort

    expect(stale).to be_empty, lambda {
      "These are documented but no longer routed; remove them from swagger/v1/swagger.yaml:\n" +
        stale.map { |verb, path| "  #{verb} #{path}" }.join("\n")
    }
  end
end
