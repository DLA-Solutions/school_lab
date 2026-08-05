// WCAG 2.1 relative luminance and contrast ratio, for specs that assert a rendered pairing rather
// than a colour name. Asserting the ratio is what makes these regression tests: a spec pinned to
// `var(--mui-palette-grey-900)` keeps passing when the token behind it moves.
//
// The measured inventory these back is `docs/guidelines/web-ui/accessibility.md`.

export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3;

const CHANNELS = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/;

const parse = (color: string): [number, number, number] => {
  const value = color.trim();

  if (value.startsWith('#')) {
    const s = value.slice(1);
    const full = s.length === 3 ? [...s].map((c) => c + c).join('') : s;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }

  const rgb = CHANNELS.exec(value);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }

  throw new Error(`Cannot parse colour: "${color}"`);
};

/**
 * Resolves what a computed style hands back. MUI's `cssVariables` theme renders every palette
 * reference as `var(--mui-palette-*)`, so the spec has to look the variable up on the documentElement
 * — that is also what pins the assertion to the scheme currently mounted.
 */
export const resolveColor = (value: string): string => {
  const variable = /^var\((--[^),]+)\)$/.exec(value.trim());
  if (!variable) {
    return value;
  }

  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(variable[1])
    .trim();

  if (!resolved) {
    throw new Error(`CSS variable ${variable[1]} is not defined on the current scheme`);
  }

  return resolveColor(resolved);
};

/** Reads a palette token out of the scheme that is currently mounted. */
export const paletteColor = (path: string): string =>
  resolveColor(`var(--mui-palette-${path.replace(/\./g, '-')})`);

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export const luminance = (color: string): number => {
  const [r, g, b] = parse(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The colour a rule actually paints on an element, resolved through the mounted scheme. */
export const computedColor = (el: Element, property: 'color' | 'background-color'): string =>
  resolveColor(getComputedStyle(el).getPropertyValue(property));
