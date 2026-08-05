# School Lab — Main Frontend

React + MUI dashboard built on the [DashdarkX](https://themewagon.github.io/dashdarkX/) template
(kept in [../base](../base)), connected to the School Lab API in [../../web](../../web).

Compared to `base`, this app has a login screen wired to the API, a session-protected shell and a
single menu item (Dashboard).

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + lint + production build
npm run test:run  # component tests (single run)
```

Recommended `Node.js v22.x` (Vite 7 requires >= 20.19).

## Tests

Vitest + React Testing Library on jsdom, configured in the `test` block of
[vite.config.ts](vite.config.ts) so specs resolve the same path aliases as the app.

```bash
npm run test      # watch mode
npm run test:run  # single run, used by CI
```

Specs live next to the component as `Component.test.tsx` and render through
[src/test/renderWithTheme.tsx](src/test/renderWithTheme.tsx), which applies `createAppTheme()` and
`CssBaseline`. Conventions: [docs/guidelines/web-ui/testing.md](../../docs/guidelines/web-ui/testing.md).

## API configuration

| Variable            | Default                 | Description                    |
| ------------------- | ----------------------- | ------------------------------ |
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL of the School Lab API |

Copy [.env.example](.env.example) to `.env` to override it.

The dev server runs on port **5173** because that is the default value of the API's
`CORS_ORIGINS` (see `web/config/initializers/cors.rb`, which allows credentials). If you serve the
frontend from another port, add it to `CORS_ORIGINS` in `web/.env`, otherwise the browser rejects
the refresh cookie.

To start the API:

```bash
cp web/.env.example web/.env
make setup && make up      # from the repository root; API at http://localhost:3000
```

## Authentication flow

Implemented from `web/swagger/v1/swagger.yaml` (`Auth` and `Me` tags):

1. `POST /api/v1/auth/login` with `{ email, password, remember_me, client: 'web' }`.
   With `client: 'web'` the API returns the access token in the body and keeps the refresh token in
   an **httpOnly cookie** — so every request is sent with `credentials: 'include'`.
2. The access token (20 min TTL) is held **in memory only**; nothing sensitive goes to
   `localStorage`.
3. On page load, [AuthProvider](src/providers/AuthProvider.tsx) calls
   `POST /api/v1/auth/refresh` (which rotates the cookie) and then `GET /api/v1/me` to restore the
   session. While that runs, the route guards show the splash screen.
4. A `401` on any authenticated request triggers one transparent refresh + replay
   ([src/services/api.ts](src/services/api.ts)).
5. `POST /api/v1/auth/logout` revokes the refresh token and clears the cookie.

Relevant files:

- [src/services/api.ts](src/services/api.ts) — fetch wrapper, error envelope, refresh-and-replay
- [src/services/authApi.ts](src/services/authApi.ts) — login / me / logout
- [src/services/tokenStore.ts](src/services/tokenStore.ts) — in-memory access token
- [src/providers/AuthProvider.tsx](src/providers/AuthProvider.tsx) — session state
- [src/routes/guards.tsx](src/routes/guards.tsx) — `RequireAuth` / `RequireGuest`
- [src/pages/authentication/Signin.tsx](src/pages/authentication/Signin.tsx) — login screen

## License

The template is distributed under the MIT License.
