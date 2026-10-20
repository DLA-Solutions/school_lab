import { ApiError } from 'services/api';

/** `POST /communication/messages` answers `409 student_inactive` once the child is no longer enrolled. */
export const isStudentInactiveError = (err: unknown): boolean =>
  err instanceof ApiError && err.code === 'student_inactive';
