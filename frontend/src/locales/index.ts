/**
 * The locales the product actually ships in.
 *
 * There is one, and the interface is written in it directly rather than through a message
 * catalogue: a catalogue with a single locale is indirection that buys nothing, and the flag menu
 * used to offer four languages that translated nothing at all. When a second locale is real, this
 * is the list it joins — and that is the moment to introduce the catalogue, not before.
 */
export interface Language {
  /** BCP 47 tag, sent to the API as `Accept-Language`. */
  code: string;
  label: string;
  /** Iconify name of the flag shown in the topbar. */
  flag: string;
}

export const LANGUAGES: Language[] = [
  {
    code: 'en-US',
    label: 'English (US)',
    flag: 'twemoji:flag-united-states',
  },
];

export const DEFAULT_LANGUAGE = LANGUAGES[0];
