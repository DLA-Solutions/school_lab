import { ReactElement, ReactNode } from 'react';
import { RenderOptions, RenderResult, render } from '@testing-library/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from 'theme/createAppTheme';
import { ActiveMembershipContext } from 'providers/ActiveMembershipContext';
import I18nProvider from 'providers/I18nProvider';
import { setLocale as selectLocale } from 'services/localeStore';
import { DEFAULT_LOCALE, type LocaleCode } from 'locales';
import { Membership } from 'types/auth';
import { activeMembershipValueFor } from './activeMembership';
import { staffMembership } from './msw';

const theme = createAppTheme();

export type ColorScheme = 'light' | 'dark';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Defaults to `dark`, the scheme the app shell boots in. */
  mode?: ColorScheme;
  /**
   * Defaults to pt-BR, the locale the product ships in. A spec that names a locale is asserting
   * something about translation; every other spec asserts what a Brazilian school sees.
   */
  locale?: LocaleCode;
  /**
   * Active memberships for `useCurrentSchool` / `useActiveMembership`. Defaults to the secretary
   * fixture so staff screens have a school without wrapping each spec. Specs that already wrap
   * `withActiveMembership` keep winning — the inner provider is the one the hook reads.
   */
  memberships?: Membership[];
  activeMembershipId?: number | null;
}

// Mirrors the app shell and the Ladle sandbox (`.ladle/components.tsx`): the product theme in its
// default dark scheme. ThemeModeProvider is left out — persisting the mode to localStorage is
// not part of what a component spec exercises, and `storageManager={null}` keeps a spec that asks
// for `light` from leaking that choice into the next one through localStorage.
const AppTheme = ({ children, mode }: { children: ReactNode; mode: ColorScheme }) => (
  <ThemeProvider theme={theme} defaultMode={mode} storageManager={null}>
    <CssBaseline enableColorScheme />
    <I18nProvider>{children}</I18nProvider>
  </ThemeProvider>
);

export const renderWithTheme = (ui: ReactElement, options?: Options): RenderResult => {
  const { mode = 'dark', locale, memberships, activeMembershipId, ...renderOptions } = options ?? {};

  // Goes through the store rather than straight to localStorage: the store keeps the choice in a
  // module variable — that is how `request()` reads it without a component around it — and only
  // consults storage once, at import. Writing the key here would leave that variable stale and
  // the option silently doing nothing.
  selectLocale(locale ?? DEFAULT_LOCALE);

  const membershipValue = activeMembershipValueFor(
    memberships ?? [staffMembership],
    activeMembershipId,
  );

  return render(ui, {
    wrapper: ({ children }) => (
      <AppTheme mode={mode}>
        <ActiveMembershipContext.Provider value={membershipValue}>
          {children}
        </ActiveMembershipContext.Provider>
      </AppTheme>
    ),
    ...renderOptions,
  });
};
