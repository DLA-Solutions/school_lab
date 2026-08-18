/// <reference types="vite/client" />

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

interface ImportMetaEnv {
  /** Vite `base` config — used as React Router basename. */
  readonly BASE_URL: string;
  /** True in development and test modes. */
  readonly DEV: boolean;
  /** Base URL of the School Lab API. Empty in production (same-origin `/api/...`). */
  readonly VITE_API_BASE_URL?: string;
  /** Vite `base` path for deploy builds (e.g. `/app/`). */
  readonly VITE_BASE_PATH?: string;
  /** Google OAuth Web client ID for GIS Sign-In button. */
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleButtonConfiguration {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  width?: number;
  locale?: string;
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId;
    };
  };
}
