/**
 * Single import for a spec that talks to the API:
 *
 * ```ts
 * import { HttpResponse, apiUrl, http, jsonError, server } from 'test/msw';
 * ```
 *
 * `http` and `HttpResponse` are re-exported so a spec writing one override does not need a
 * second import from `msw` itself.
 */
export { HttpResponse, http } from 'msw';
export * from './handlers';
export { server } from './server';
