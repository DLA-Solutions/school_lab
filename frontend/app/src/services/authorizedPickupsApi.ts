import { apiAssetUrl, request } from './api';

/**
 * Somebody the family allows to collect a child at the gate — a grandmother, a driver, an aunt.
 *
 * Mirrors `AuthorizedPickupBlueprint` (web/app/blueprints/authorized_pickup_blueprint.rb).
 */
export interface AuthorizedPickup {
  id: number;
  student_id: number;
  name: string;
  /** Canonical 11 digits — format with `formatCpf` for display. */
  cpf: string;
  phone: string | null;
  /** Whether there is a face for staff to check against, not just a name. */
  has_photo: boolean;
  /** Host-relative as Active Storage returns it; use `pickupPhotoUrl` to reach it. */
  photo_url: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface AuthorizedPickupPayload {
  name: string;
  cpf: string;
  phone?: string;
  photo?: File | null;
}

/**
 * The same list is reached from two sides: the school's register reads it, and the family writes
 * it from the portal. Only the family may add or withdraw somebody — the API enforces that, and
 * the school route offers no write at all.
 */
const schoolPath = (schoolId: number, studentId: number) =>
  `/api/v1/schools/${schoolId}/people/students/${studentId}/authorized_pickups`;

const portalPath = (schoolId: number, studentId: number) =>
  `/api/v1/schools/${schoolId}/me/students/${studentId}/authorized_pickups`;

export const listAuthorizedPickups = async (
  schoolId: number,
  studentId: number,
  { asGuardian = false } = {},
): Promise<AuthorizedPickup[]> => {
  const path = asGuardian ? portalPath(schoolId, studentId) : schoolPath(schoolId, studentId);
  const response = await request<{ data: AuthorizedPickup[] }>(path);

  return response.data;
};

/**
 * The photo rides in the body, so this is a FormData rather than JSON — the same shape the
 * documents upload uses. Only the family may do this.
 */
export const createAuthorizedPickup = async (
  schoolId: number,
  studentId: number,
  { name, cpf, phone, photo }: AuthorizedPickupPayload,
): Promise<AuthorizedPickup> => {
  const body = new FormData();
  body.append('authorized_pickup[name]', name);
  body.append('authorized_pickup[cpf]', cpf);
  if (phone) {
    body.append('authorized_pickup[phone]', phone);
  }
  if (photo) {
    body.append('authorized_pickup[photo]', photo);
  }

  const response = await request<{ data: AuthorizedPickup }>(portalPath(schoolId, studentId), {
    method: 'POST',
    body,
  });

  return response.data;
};

/** Withdrawn rather than deleted: who was allowed on a given day is asked about afterwards. */
export const deleteAuthorizedPickup = (schoolId: number, studentId: number, id: number) =>
  request<null>(`${portalPath(schoolId, studentId)}/${id}`, { method: 'DELETE' });

/** The blueprint returns `photo_url` host-relative; this puts the API origin back on. */
export const pickupPhotoUrl = (pickup: AuthorizedPickup) => apiAssetUrl(pickup.photo_url);
