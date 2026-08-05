import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { server } from './msw/server';

// Vitest runs without injected globals, so Testing Library's own auto-cleanup never registers.
afterEach(cleanup);

// `onUnhandledRequest: 'error'` is the point of the harness: a call to an endpoint nobody
// mocked fails the test instead of quietly hitting the network and passing.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Drops per-test overrides added with `server.use`, so the defaults are back for the next one.
afterEach(() => server.resetHandlers());

afterAll(() => server.close());
