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
  id?: string;
  [key: string]: unknown;
}
