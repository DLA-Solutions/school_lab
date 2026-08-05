import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * One interceptor for the whole suite. `src/test/setup.ts` starts it before each file,
 * resets it between tests (dropping anything a spec added with `server.use`) and closes
 * it at the end.
 */
export const server = setupServer(...handlers);
