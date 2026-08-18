import { ImpersonationSession, StartImpersonationPayload } from 'types/impersonation';
import { request } from './api';

const PATH = '/api/v1/platform/impersonations';

export const startImpersonation = async (
  payload: StartImpersonationPayload,
): Promise<ImpersonationSession> => {
  const response = await request<{ data: ImpersonationSession }>(PATH, {
    method: 'POST',
    body: { impersonation: payload },
  });

  return response.data;
};

export const endImpersonation = (sessionId: number) =>
  request<null>(`${PATH}/${sessionId}`, { method: 'DELETE' });

/** Opens the school SPA in a new tab with the impersonation access token. */
export const openSchoolSpaAsImpersonatedUser = (session: ImpersonationSession) => {
  const appBase = import.meta.env.VITE_SCHOOL_APP_URL ?? '/app/';
  const url = new URL(appBase, window.location.origin);
  url.searchParams.set('impersonation_token', session.access_token);
  url.searchParams.set('access_expires_at', session.access_expires_at);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
};
