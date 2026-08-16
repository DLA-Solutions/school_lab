/** Persists only the selected membership id — never names, CPF, or financial data. */
export const ACTIVE_MEMBERSHIP_STORAGE_KEY = 'school-lab-active-membership-id';

export const getStoredActiveMembershipId = (): number | null => {
  try {
    const stored = localStorage.getItem(ACTIVE_MEMBERSHIP_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const id = Number(stored);

    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
};

export const setStoredActiveMembershipId = (id: number | null) => {
  try {
    if (id === null) {
      localStorage.removeItem(ACTIVE_MEMBERSHIP_STORAGE_KEY);
      return;
    }

    localStorage.setItem(ACTIVE_MEMBERSHIP_STORAGE_KEY, String(id));
  } catch {
    // Not remembering the choice is a smaller failure than refusing to switch.
  }
};

export const clearStoredActiveMembershipId = () => setStoredActiveMembershipId(null);
