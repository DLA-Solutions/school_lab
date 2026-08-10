export type PermissionToggleState = 'off' | 'grant' | 'inherit' | 'deny';

export const buildFormState = (
  templatePermissionKeys: string[],
  allPermissionKeys: string[],
  grants: string[],
  denies: string[],
): Record<string, PermissionToggleState> => {
  const state: Record<string, PermissionToggleState> = {};

  for (const key of allPermissionKeys) {
    if (templatePermissionKeys.includes(key)) {
      state[key] = denies.includes(key) ? 'deny' : 'inherit';
    } else {
      state[key] = grants.includes(key) ? 'grant' : 'off';
    }
  }

  return state;
};

/** Maps dialog toggle state back to the PATCH body (`grants[]` / `denies[]`). */
export const buildOverridesPayload = (
  formState: Record<string, PermissionToggleState>,
  templatePermissionKeys: string[],
): { grants: string[]; denies: string[] } => {
  const grants: string[] = [];
  const denies: string[] = [];

  for (const [key, value] of Object.entries(formState)) {
    if (templatePermissionKeys.includes(key)) {
      if (value === 'deny') {
        denies.push(key);
      }
    } else if (value === 'grant') {
      grants.push(key);
    }
  }

  return { grants, denies };
};
