# frozen_string_literal: true

module Api
  module V1
    # The topbar bell: always the current user's own notifications, across whichever school they
    # are looking at — there is no school-scoped equivalent, the same way `me` has none.
    class NotificationsController < BaseController
      def index
        pagy, records = pagy(Current.user.notifications.recent_first)

        render json: {
          data: NotificationBlueprint.render_as_hash(records),
          meta: {
            page: pagy.page, per_page: pagy.limit, total: pagy.count,
            unread_count: Current.user.notifications.unread.count
          }
        }
      end

      def update
        notification = Current.user.notifications.find(params[:id])
        notification.mark_read!

        render json: { data: NotificationBlueprint.render_as_hash(notification) }
      end

      def mark_all_as_read
        Current.user.notifications.unread.update_all(read_at: Time.current)

        render json: { data: { unread_count: 0 } }
      end
    end
  end
end
