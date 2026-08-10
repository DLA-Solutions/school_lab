/** Keys the owner explicitly granted on top of the role template. */
export const deriveGrants = (permissionSources: Record<string, string>): string[] =>
  Object.entries(permissionSources)
    .filter(([, source]) => source === 'grant')
    .map(([key]) => key);

/**
 * Template baseline keys that are currently denied or gated out of the effective set.
 * The API does not expose a raw `denies[]` field — derive it from template vs effective keys.
 */
export const deriveDenies = (
  templatePermissionKeys: string[],
  effectivePermissionKeys: string[],
): string[] => templatePermissionKeys.filter((key) => !effectivePermissionKeys.includes(key));

export const deriveOverrides = (
  permissionSources: Record<string, string>,
  templatePermissionKeys: string[],
  effectivePermissionKeys: string[],
): { grants: string[]; denies: string[] } => ({
  grants: deriveGrants(permissionSources),
  denies: deriveDenies(templatePermissionKeys, effectivePermissionKeys),
});
