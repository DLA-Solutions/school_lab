# Testing the SPA

Component tests for `frontend/app`. The behavior-first principle is the same one
`docs/guidelines/web/testing.md` states for the API: assert what a user sees and can do.

## Runner

| Piece | Choice |
|-------|--------|
| Runner | **Vitest** — configured in `frontend/app/vite.config.ts` (`test` block), so tests resolve the `theme`, `components`, `design-system`, `providers` and `assets` aliases exactly as the app does |
| Environment | `jsdom` |
| DOM assertions | **React Testing Library** + `@testing-library/jest-dom` |
| Interaction | `@testing-library/user-event` |
| API mocking | **MSW** (`msw/node`) — handlers in `src/test/msw/`, server started from the setup file |
| Setup | `src/test/setup.ts` — jest-dom matchers, Testing Library cleanup, MSW lifecycle |

```bash
cd frontend/app
npm run test        # watch mode
npm run test:run    # single run (CI)
```

Vitest imports are explicit (`import { describe, expect, it } from 'vitest'`); there are no
injected globals.

## Conventions

- Specs sit next to the component as `Component.test.tsx`, the same way stories do.
- Render through `renderWithTheme` (`src/test/renderWithTheme.tsx`), which wraps the component in
  `createAppTheme()` plus `CssBaseline` in the default dark scheme — never rebuild that scaffolding
  in a spec.
- Query by role and visible text. No snapshot blobs, no assertions on class names or internal
  state.
- Test the props a caller can set and the callbacks it passes, not how the component renders them.
- Synthetic data only — no real student, guardian, CPF or school data in a fixture (LGPD).

## Mocking the API

Anything that reaches `/api/v1` goes through **MSW**. The spec never stubs `fetch` and never
mocks `src/services/` — it lets the real client run and answers it at the network boundary, so
the request headers, the retry and the error unwrapping are all under test.

| File | Holds |
|------|-------|
| `src/test/msw/handlers.ts` | The default handlers, the fixtures they serve, and the `apiUrl` / `jsonError` / `paginated` helpers |
| `src/test/msw/server.ts` | `setupServer(...handlers)` — one interceptor for the suite |
| `src/test/msw/index.ts` | The barrel a spec imports, re-exporting `http` and `HttpResponse` too |

**Unhandled requests fail.** The server starts with `onUnhandledRequest: 'error'`, so a call to
an endpoint nobody mocked raises instead of falling through to the network. A green test can
never mean "the request silently went nowhere" — if a spec hits a new endpoint, it must add a
handler.

The defaults cover the shapes the client depends on: `POST /auth/login`, `POST /auth/refresh`,
`POST /auth/logout` (204), `GET /me`, and a paginated `GET /schools/:school_id/me/charges`.
The protected handlers only accept `FRESH_ACCESS_TOKEN`; seeding the token store with
`STALE_ACCESS_TOKEN` makes them answer 401, which is how a spec exercises the
refresh-then-retry path in `services/api.ts` without a single hand-written mock.

### Adding a handler

Add it to the `handlers` array in `handlers.ts` when the endpoint is one that several specs will
need. Build the URL with `apiUrl` — it is derived from the same `API_BASE_URL` the client reads,
so a handler cannot drift from the caller. Return `paginated(rows, new URL(request.url))` for a
list endpoint and `jsonError(...)` for a failure, so the `{ data, meta }` and
`{ error: { code, message, details } }` envelopes stay identical to `docs/api/README.md`.

### Overriding one per test

`server.use()` replaces a single endpoint for the current test only; `src/test/setup.ts` resets
the handlers in an `afterEach`, so the defaults are back for the next one. Never rebuild the
whole set.

```ts
import { apiUrl, http, jsonError, server } from 'test/msw';

it('surfaces the API validation message', async () => {
  server.use(
    http.get(apiUrl('/api/v1/schools/42/me/charges'), () =>
      jsonError(422, 'validation_error', 'Não foi possível salvar.', {
        due_date: ['must be in the future'],
      }),
    ),
  );

  // …assert what the user sees
});
```

Error `message` values in fixtures are pt-BR because that is what the API returns
(`Accept-Language: pt-BR`); every identifier, code and comment around them stays English.

## Coverage today

**97 tests across 19 spec files** (`npm run test:run`, August 2026). The design-system pattern
components were the first target (`docs/prds/layer-web-spa.md` → Roadmap Phase 5) and are covered
except `SectionCard`; `useChartTheme` and `DataTable` are covered too.

| Area | Files | What is asserted |
|------|-------|------------------|
| Patterns | `design-system/patterns/*.test.tsx` (7), `data/DataTable.test.tsx` | Props a caller sets, callbacks it passes, and the string props that replaced the hardcoded labels |
| Hook | `design-system/hooks/useChartTheme.test.tsx` | The `ChartTheme` shape resolves per scheme rather than off the pinned palette |
| Theme | `theme/componentOverrides.test.tsx` | The overrides that change behaviour, plus the contrast pairings listed below |
| Shell | `layouts/.../ListItem.test.tsx`, `layouts/main-layout/SkipLink.test.tsx` | `aria-current`, full opacity on the nav button, and the skip link's focus behaviour |
| Sections | `kpi/`, `website-visitors/`, `revenue-by-customer/`, `completed-task/`, `common/DateSelect` | Chart option colours captured per scheme; the picker field and the KPI glyph measured |
| Services | `services/api.test.ts` | The client end to end over MSW |

**Contrast is asserted, not just documented.** `src/test/contrast.ts` computes the WCAG ratio from
the colour the mounted scheme actually resolves, and `componentOverrides.test.tsx`,
`ListItem.test.tsx`, `KPI.test.tsx` and `DateSelect.test.tsx` assert it in **both** schemes. These
specs assert the *ratio*, never the colour name, so a token that moves underneath an override fails
a test instead of quietly failing WCAG. The measured inventory they back is
[accessibility.md](./accessibility.md). Add one whenever a fix there lands in the theme.

On the service side, `src/services/api.test.ts` covers the client end to end over MSW: the
bearer header, the `Accept-Language: pt-BR` the contract requires on every call, the paginated
envelope, `ApiError` unwrapping, school isolation, and the 401 → refresh → retry path. Asserting
a default header goes through `server.events.on('request:start', ...)` rather than a handler
assertion, so one spec can check the whole sequence a retry produces.

**Not covered yet:** `SectionCard`, the three pages (`Dashboard`, `Signin`, `Error404`) and the
route guards in `src/routes/`. Those are the next target.
