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
}
