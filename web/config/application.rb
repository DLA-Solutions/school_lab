require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require "action_view/railtie"
require "action_cable/engine"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module SchoolLab
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # The product serves Brazilian schools and its billing boundaries (boleto due dates,
    # grace windows, monthly billing periods) are calendar dates in the school's local
    # timezone, not UTC instants. Leaving this at the UTC default made `Date.current`
    # roll over three hours early every night, marking charges overdue a day too soon.
    # Timestamps stay stored in UTC — `active_record.default_timezone` remains `:utc`.
    config.time_zone = "America/Sao_Paulo"
    # config.eager_load_paths << Rails.root.join("extras")

    config.generators do |g|
      g.helper false
      g.assets false
      g.system_tests nil
      g.test_framework :rspec
      g.fixture_replacement :factory_bot, dir: "spec/factories"
    end

    config.api_only = true
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::CookieStore

    config.x.billing = ActiveSupport::OrderedOptions.new
    config.x.billing.webhook_events_retention_days = ENV.fetch("WEBHOOK_EVENTS_RETENTION_DAYS", 180).to_i
  end
end
