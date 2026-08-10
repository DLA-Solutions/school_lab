import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from 'test/renderWithTheme';
import LanguageSelect from 'layouts/main-layout/topbar/LanguageSelect';
import { useTranslation } from 'providers/I18nContext';
import { getLocale } from 'services/localeStore';
import { CATALOGUES, DEFAULT_LOCALE, enUS, format, LANGUAGES, ptBR } from 'locales';

const user = userEvent.setup({ delay: null });

const Sample = () => {
  const { t, locale } = useTranslation();

  return (
    <>
      <span data-testid="locale">{locale}</span>
      <span data-testid="message">{t('charges.newOneOff')}</span>
    </>
  );
};

describe('locales', () => {
  // A Brazilian school should not have to pick its own language every morning.
  it('starts in Portuguese', () => {
    renderWithTheme(<Sample />);

    expect(screen.getByTestId('locale')).toHaveTextContent(DEFAULT_LOCALE);
    expect(screen.getByTestId('message')).toHaveTextContent('Novo boleto avulso');
  });

  it('reads in English once that locale is chosen', () => {
    renderWithTheme(<Sample />, { locale: 'en-US' });

    expect(screen.getByTestId('message')).toHaveTextContent('New one-off boleto');
  });

  // The old menu offered five languages and translated none of them: picking one changed the flag
  // and left every screen exactly as it was.
  it('translates the interface when the flag is switched', async () => {
    renderWithTheme(
      <>
        <LanguageSelect />
        <Sample />
      </>,
    );

    expect(screen.getByTestId('message')).toHaveTextContent('Novo boleto avulso');

    await user.click(screen.getByRole('button', { name: 'Idioma' }));
    await user.click(await screen.findByText('English (US)'));

    expect(screen.getByTestId('message')).toHaveTextContent('New one-off boleto');
    expect(screen.getByTestId('locale')).toHaveTextContent('en-US');
  });

  // `request()` puts `Accept-Language` on every call from this store, so a validation error
  // arrives in the same language as the field it is printed under.
  it('carries the choice to what the API is told', async () => {
    renderWithTheme(<LanguageSelect />);

    expect(getLocale()).toBe('pt-BR');

    await user.click(screen.getByRole('button', { name: 'Idioma' }));
    await user.click(await screen.findByText('English (US)'));

    expect(getLocale()).toBe('en-US');
  });

  it('offers exactly the locales that have a catalogue', () => {
    expect(LANGUAGES.map((language) => language.code).sort()).toEqual(
      Object.keys(CATALOGUES).sort(),
    );
  });

  // A key present in one catalogue and missing from the other would render as the key itself.
  // TypeScript catches a missing English key; this catches the reverse and anything stale.
  it('says the same things in both languages', () => {
    expect(Object.keys(enUS).sort()).toEqual(Object.keys(ptBR).sort());
  });

  // Nothing forces a translator to actually translate, and an untouched copy of the Portuguese
  // reaches a customer looking deliberate.
  it('does not leave Portuguese sitting in the English catalogue', () => {
    const untranslated = Object.keys(ptBR).filter((key) => {
      const message = enUS[key as keyof typeof enUS];

      return message === ptBR[key as keyof typeof ptBR] && /[ãõçáéíóúâêô]/i.test(message);
    });

    expect(untranslated).toEqual([]);
  });

  it('fills placeholders and leaves unknown ones alone', () => {
    expect(format('{count} of {total}', { count: 2, total: 5 })).toBe('2 of 5');
    expect(format('{count} of {total}', { count: 2 })).toBe('2 of {total}');
  });
});
