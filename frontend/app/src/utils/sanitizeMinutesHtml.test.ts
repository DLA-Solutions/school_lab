import { describe, expect, it } from 'vitest';
import { sanitizeMinutesHtml } from './sanitizeMinutesHtml';

describe('sanitizeMinutesHtml', () => {
  it('keeps the allowed subset', () => {
    const html = '<h2>Pauta</h2><p>Texto <strong>forte</strong> e <em>itálico</em><br></p><ul><li>a</li></ul>';

    expect(sanitizeMinutesHtml(html)).toBe(html);
  });

  it('maps editor tags onto the allowed ones', () => {
    expect(sanitizeMinutesHtml('<div><b>x</b> <i>y</i></div>')).toBe(
      '<p><strong>x</strong> <em>y</em></p>',
    );
  });

  it('strips attributes, scripts and unknown wrappers', () => {
    const dirty =
      '<p style="color:red" onclick="x()">oi <span class="a">mundo</span><script>alert(1)</script></p>';

    expect(sanitizeMinutesHtml(dirty)).toBe('<p>oi mundo</p>');
  });

  it('wraps loose text in a paragraph', () => {
    expect(sanitizeMinutesHtml('só texto')).toBe('<p>só texto</p>');
  });

  it('returns an empty string when nothing was written', () => {
    expect(sanitizeMinutesHtml('')).toBe('');
    expect(sanitizeMinutesHtml('<div> </div>')).toBe('');
  });
});
