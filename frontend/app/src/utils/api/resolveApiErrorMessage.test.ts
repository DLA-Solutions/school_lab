import { describe, expect, it } from 'vitest';
import { ApiError } from 'services/api';
import { resolveApiErrorMessage } from 'utils/api/resolveApiErrorMessage';

const t = (key: string) => {
  const labels: Record<string, string> = {
    'errors.schoolAccessDenied': 'Sem acesso a esta escola. Troque de perfil no menu.',
    'errors.accessDenied': 'Acesso negado.',
    'errors.membershipSuspended': 'Acesso suspenso nesta escola.',
    'errors.membershipInvited': 'Convite pendente para esta escola.',
    'guardians.loadError': 'Erro genérico.',
  };

  return labels[key] ?? key;
};

describe('resolveApiErrorMessage', () => {
  it('maps school-scoped 404 not_found to school access guidance', () => {
    const message = resolveApiErrorMessage(
      new ApiError(404, 'not_found', 'Não encontrado.', {}),
      t,
      'guardians.loadError',
    );

    expect(message).toBe('Sem acesso a esta escola. Troque de perfil no menu.');
  });

  it('maps 403 forbidden to access denied', () => {
    const message = resolveApiErrorMessage(
      new ApiError(403, 'forbidden', 'Acesso negado.', {}),
      t,
      'guardians.loadError',
    );

    expect(message).toBe('Acesso negado.');
  });

  it('maps membership_suspended and membership_invited codes', () => {
    expect(
      resolveApiErrorMessage(
        new ApiError(403, 'membership_suspended', 'Acesso suspenso nesta escola.', {}),
        t,
        'guardians.loadError',
      ),
    ).toBe('Acesso suspenso nesta escola.');

    expect(
      resolveApiErrorMessage(
        new ApiError(403, 'membership_invited', 'Convite pendente para esta escola.', {}),
        t,
        'guardians.loadError',
      ),
    ).toBe('Convite pendente para esta escola.');
  });

  it('falls back to the API message for other ApiError codes', () => {
    expect(
      resolveApiErrorMessage(
        new ApiError(422, 'validation_error', 'CPF inválido.', {}),
        t,
        'guardians.loadError',
      ),
    ).toBe('CPF inválido.');
  });

  it('falls back to the locale key for non-ApiError errors', () => {
    expect(resolveApiErrorMessage(new Error('network'), t, 'guardians.loadError')).toBe(
      'Erro genérico.',
    );
  });
});
