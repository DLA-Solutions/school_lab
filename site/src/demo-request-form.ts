const API_URL = '/api/v1/marketing/demo_request';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface DemoRequestPayload {
  name: string;
  email: string;
  phone: string;
  website: string;
}

interface ApiErrorEnvelope {
  error?: {
    message?: string;
    details?: Record<string, string[] | string>;
  };
}

const container = document.querySelector<HTMLElement>('[data-demo-form]');
const form = container?.querySelector<HTMLFormElement>('.demo-form__form');
const successPanel = container?.querySelector<HTMLElement>('.demo-form__success');
const feedback = container?.querySelector<HTMLElement>('.demo-form__feedback--error');
const submitButton = container?.querySelector<HTMLButtonElement>('.demo-form__submit');

const phoneInput = form?.querySelector<HTMLInputElement>('[name="phone"]');

if (container && form && successPanel && feedback && submitButton) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void handleSubmit(form);
  });
}

if (phoneInput) {
  phoneInput.addEventListener('input', () => {
    applyBrazilianPhoneMask(phoneInput);
  });
  phoneInput.addEventListener('paste', () => {
    requestAnimationFrame(() => {
      applyBrazilianPhoneMask(phoneInput);
    });
  });
}

async function handleSubmit(formElement: HTMLFormElement): Promise<void> {
  if (!container || !successPanel || !feedback || !submitButton) {
    return;
  }

  clearFeedback(feedback);
  setState(container, 'submitting', submitButton, true);

  const payload = readPayload(formElement);

  try {
    await submitDemoRequest(payload);
    formElement.reset();
    formElement.hidden = true;
    successPanel.hidden = false;
    setState(container, 'success', submitButton, false);
  } catch (error: unknown) {
    showFeedback(
      feedback,
      error instanceof Error
        ? error.message
        : 'Não foi possível enviar sua solicitação. Tente novamente em instantes.',
    );
    setState(container, 'error', submitButton, false);
  }
}

function readPayload(formElement: HTMLFormElement): DemoRequestPayload {
  const formData = new FormData(formElement);

  return {
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    website: String(formData.get('website') ?? '').trim(),
  };
}

async function submitDemoRequest(payload: DemoRequestPayload): Promise<void> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 204) {
    return;
  }

  if (response.status === 429) {
    throw new Error(
      'Você enviou uma solicitação recentemente. Aguarde alguns minutos antes de tentar novamente.',
    );
  }

  if (response.status === 422) {
    const body = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
    throw new Error(formatValidationError(body));
  }

  throw new Error('Não foi possível enviar sua solicitação. Tente novamente em instantes.');
}

function formatValidationError(body: ApiErrorEnvelope | null): string {
  const details = body?.error?.details;

  if (details && typeof details === 'object') {
    const messages = Object.values(details)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    if (messages.length > 0) {
      return messages[0];
    }
  }

  if (body?.error?.message) {
    return body.error.message;
  }

  return 'Verifique os dados informados e tente novamente.';
}

function setState(
  formContainer: HTMLElement,
  state: FormState,
  button: HTMLButtonElement,
  isSubmitting: boolean,
): void {
  formContainer.dataset.state = state;
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? 'Enviando…' : 'Enviar solicitação';
}

function clearFeedback(element: HTMLElement): void {
  element.textContent = '';
  element.hidden = true;
}

function showFeedback(element: HTMLElement, message: string): void {
  element.textContent = message;
  element.hidden = false;
}

function extractBrazilianPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
}

function formatBrazilianPhone(digits: string): string {
  if (digits.length === 0) {
    return '';
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const areaCode = digits.slice(0, 2);
  const localNumber = digits.slice(2);
  const isMobile = localNumber[0] === '9';

  if (isMobile) {
    if (localNumber.length <= 5) {
      return `(${areaCode}) ${localNumber}`;
    }

    return `(${areaCode}) ${localNumber.slice(0, 5)}-${localNumber.slice(5)}`;
  }

  if (localNumber.length <= 4) {
    return `(${areaCode}) ${localNumber}`;
  }

  return `(${areaCode}) ${localNumber.slice(0, 4)}-${localNumber.slice(4)}`;
}

function cursorPositionForDigitIndex(formatted: string, digitIndex: number): number {
  if (digitIndex <= 0) {
    return 0;
  }

  let seenDigits = 0;

  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index] ?? '')) {
      seenDigits += 1;

      if (seenDigits >= digitIndex) {
        return index + 1;
      }
    }
  }

  return formatted.length;
}

function applyBrazilianPhoneMask(input: HTMLInputElement): void {
  const selectionStart = input.selectionStart ?? input.value.length;
  const digitsBeforeCursor = extractBrazilianPhoneDigits(
    input.value.slice(0, selectionStart),
  ).length;
  const digits = extractBrazilianPhoneDigits(input.value);
  const formatted = formatBrazilianPhone(digits);

  if (formatted === input.value) {
    return;
  }

  input.value = formatted;

  const nextCursor = cursorPositionForDigitIndex(formatted, digitsBeforeCursor);
  input.setSelectionRange(nextCursor, nextCursor);
}
