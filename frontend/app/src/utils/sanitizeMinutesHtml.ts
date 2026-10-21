/**
 * Keeps an ata body inside the subset the API accepts (`docs/api/v1/documents-and-archive.md`
 * § Livro Ata): `h1`–`h4`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `br`, no attributes.
 *
 * This is UX, not the security boundary — the API sanitizes again — but a browser's
 * `contentEditable` emits `div`, `b`, `i` and styled `span`s, and what gets sent should already be
 * the shape the PDF will render.
 */
const ALLOWED = new Set(['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'br']);

/** Tags that map onto an allowed one rather than being unwrapped. */
const ALIASES: Record<string, string> = {
  b: 'strong',
  i: 'em',
  div: 'p',
  h5: 'h4',
  h6: 'h4',
};

/** Tags whose content is never text a person wrote. */
const DROPPED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template']);

const INLINE = new Set(['strong', 'em', 'br']);

const clean = (source: Node, target: Node, doc: Document) => {
  source.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.textContent ?? ''));
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = child as Element;
    const name = element.tagName.toLowerCase();

    if (DROPPED.has(name)) {
      return;
    }

    const mapped = ALIASES[name] ?? name;

    if (!ALLOWED.has(mapped)) {
      // Unknown wrapper (span, font, a, …): keep what was written, lose the wrapper.
      clean(element, target, doc);
      return;
    }

    const copy = doc.createElement(mapped);
    if (mapped !== 'br') {
      clean(element, copy, doc);
    }
    target.appendChild(copy);
  });
};

/** Loose text and inline runs at the top level read as a paragraph. */
const wrapLooseRuns = (root: HTMLElement, doc: Document) => {
  const result = doc.createElement('div');
  let run: HTMLElement | null = null;

  Array.from(root.childNodes).forEach((node) => {
    const isInline =
      node.nodeType === Node.TEXT_NODE ||
      (node.nodeType === Node.ELEMENT_NODE && INLINE.has((node as Element).tagName.toLowerCase()));

    if (isInline) {
      run ??= result.appendChild(doc.createElement('p'));
      run.appendChild(node);
      return;
    }

    run = null;
    result.appendChild(node);
  });

  return result;
};

export const sanitizeMinutesHtml = (html: string): string => {
  if (!html.trim()) {
    return '';
  }

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out = doc.createElement('div');
  clean(doc.body, out, doc);

  const wrapped = wrapLooseRuns(out, doc);
  const hasContent = (wrapped.textContent ?? '').trim() !== '' || wrapped.querySelector('li, br');

  return hasContent ? wrapped.innerHTML : '';
};

export default sanitizeMinutesHtml;
