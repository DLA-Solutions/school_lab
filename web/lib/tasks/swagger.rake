# frozen_string_literal: true

# Keeping the OpenAPI document honest about what the API actually exposes.
#
# rswag generates `swagger/v1/swagger.yaml` from the specs that describe endpoints in detail, and
# those descriptions are worth having — request bodies, real examples, the meaning of each status.
# But an endpoint only appears there if somebody remembered to write such a spec, and most of them
# were not: the routing table listed far more paths than the document did, so a reader had no way
# to tell "undocumented" from "does not exist".
#
# `swagger:sync` closes that gap from the routing table itself. It never touches an operation that
# is already described — it only fills in the ones that are missing, marked `x-generated` so the
# difference stays visible and someone can replace a stub with a real rswag spec later.
namespace :swagger do
  DOC_PATH = Rails.root.join("swagger/v1/swagger.yaml")

  # Endpoints that are reached without a token, so the document must not claim otherwise.
  PUBLIC_ACTIONS = [
    %r{\A/api/v1/auth/(login|refresh)\z}
  ].freeze

  desc "Add every route missing from the OpenAPI document, without touching what is described"
  task sync: :environment do
    doc = JSON.parse(DOC_PATH.read)
    doc["paths"] ||= {}

    added = []

    api_routes.each do |route|
      path = openapi_path(route[:path])
      verb = route[:verb].downcase

      operations = (doc["paths"][path] ||= {})
      next if operations.key?(verb)

      operations[verb] = operation_for(route, path)
      added << "#{route[:verb]} #{route[:path]}"
    end

    DOC_PATH.write("#{JSON.pretty_generate(sort_paths(doc))}\n")

    if added.empty?
      puts "Nothing to add — every route is already in the document."
    else
      puts "Added #{added.size} operation(s):"
      added.sort.each { |line| puts "  #{line}" }
    end
  end

  desc "Regenerate the described operations from the specs, then fill in the rest"
  task build: :environment do
    Rake::Task["rswag:specs:swaggerize"].invoke
    Rake::Task["swagger:sync"].invoke
  end

  # Every API route, one row per verb. Rails lists `PATCH` and `PUT` for the same action; both are
  # real and both belong in the document.
  def api_routes
    Rails.application.routes.routes.filter_map do |route|
      path = route.path.spec.to_s.sub("(.:format)", "")
      next unless path.start_with?("/api/v1/")

      verbs = route.verb.to_s.gsub(/[$^]/, "").split("|").reject(&:blank?)
      next if verbs.empty?

      controller = route.defaults[:controller]
      action = route.defaults[:action]
      next if controller.blank? || action.blank?

      verbs.map do |verb|
        { verb: verb, path: path, controller: controller, action: action }
      end
    end.flatten
  end

  def openapi_path(path)
    path.gsub(/:(\w+)/) { "{#{Regexp.last_match(1)}}" }
  end

  def operation_for(route, path)
    operation = {
      "summary" => summary_for(route),
      "tags" => [ tag_for(route) ],
      "operationId" => "#{route[:controller].tr('/', '_')}_#{route[:action]}",
      "parameters" => path_parameters(path),
      "responses" => responses_for(route),
      # Says plainly that nobody has described this one yet, so a reader knows the difference
      # between a documented contract and a derived stub.
      "x-generated" => true
    }

    operation["security"] = [ { "bearer_auth" => [] } ] unless public?(route[:path])
    operation
  end

  def public?(path)
    PUBLIC_ACTIONS.any? { |pattern| path.match?(pattern) }
  end

  def path_parameters(path)
    path.scan(/\{(\w+)\}/).flatten.map do |name|
      {
        "name" => name,
        "in" => "path",
        "required" => true,
        "schema" => { "type" => "string" },
        "description" => name == "school_id" ? "School the resource belongs to" : nil
      }.compact
    end
  end

  # What the action does, in the words the codebase already uses for it.
  SUMMARIES = {
    "index" => "List", "show" => "Show", "create" => "Create",
    "update" => "Update", "destroy" => "Delete"
  }.freeze

  def summary_for(route)
    resource = route[:controller].split("/").last.humanize.downcase
    verb = SUMMARIES[route[:action]]

    return "#{verb} #{resource}" if verb

    "#{route[:action].humanize} — #{resource}"
  end

  # The area of the product, which is how the reference is browsed: Billing, People, Academics.
  def tag_for(route)
    segments = route[:controller].sub("api/v1/", "").split("/")
    segments.shift if segments.first == "schools"

    segments.size > 1 ? segments.first.camelize : "Schools"
  end

  def responses_for(route)
    success =
      case route[:verb]
      when "POST" then { "201" => { "description" => "created" } }
      when "DELETE" then { "204" => { "description" => "deleted" } }
      else { "200" => { "description" => "ok" } }
      end

    return success if public?(route[:path])

    success.merge(
      "401" => { "description" => "not authenticated" },
      "403" => { "description" => "not allowed" }
    )
  end

  # Paths in routing order read as noise; alphabetical is how a reference is searched.
  def sort_paths(doc)
    doc.merge("paths" => doc["paths"].sort.to_h)
  end
end
