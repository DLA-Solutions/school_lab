# Redis client — used when switching cache to Redis (see docs/web-stack.md).
# Not used for background jobs (Solid Queue stays on PostgreSQL).
if ENV["REDIS_URL"].present?
  require "redis"

  REDIS = Redis.new(url: ENV.fetch("REDIS_URL"))
end
