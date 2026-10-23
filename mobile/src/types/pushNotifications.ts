/**
 * Matches `DeviceToken::PLATFORMS` in `web/app/models/device_token.rb`.
 */
export type DeviceTokenPlatform = 'ios' | 'android' | 'web';

/** `web/app/blueprints/device_token_blueprint.rb` */
export interface DeviceToken {
  id: number;
  token: string;
  platform: DeviceTokenPlatform;
  created_at: string;
}

/** POST /api/v1/me/device_tokens — `web/app/controllers/api/v1/me/device_tokens_controller.rb` */
export interface RegisterDeviceTokenResponse {
  data: DeviceToken;
}

/**
 * Data payload attached to a push message so a tap can deep-link to the source
 * (`docs/prds/layer-mobile-app.md` NFR "Push tap deep-links to thread or charge
 * detail"). The FCM send pipeline (gateway + job + AASM state machine, `web/`) is
 * being built in parallel and this shape is not yet frozen in
 * `docs/api/v1/communication.md` — treat `type`/`id` as a best-effort convention to
 * confirm once the notification payload contract lands, not a guaranteed contract.
 */
export interface PushNotificationDeepLinkData {
  type?: 'thread' | 'charge' | string;
  /** Charge id when `type` is `charge`. FCM data values are often numeric strings. */
  id?: string | number;
  /**
   * Family-chat bell rows use `kind: 'message'` and `conversation_id`
   * (`docs/api/v1/communication.md`). FCM data values are often strings.
   * `type: 'charge'` opens that charge when `id` is present, otherwise the boletos list.
   * An existing `charge_id` on the payload (index signature) also identifies the charge.
   */
  kind?: string;
  conversation_id?: number | string;
  /**
   * Read only when the payload already carries them. A routine tap is
   * `kind` / `channel_key` / `type` of `daily_routine` or `routine`, or
   * `source_type` `DailyRoutineEntry`. `student_id` is the same positive-id
   * shape as `conversation_id`.
   */
  channel_key?: string;
  source_type?: string;
  student_id?: number | string;
  [key: string]: unknown;
}
