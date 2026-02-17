/**
 * localStorageUiPrefs — lightweight, type-safe UI preference store.
 * Ticket 0267: baseline session ID.
 */

const PREFS_KEY = "complex-mapper-ui-prefs";

interface UiPrefs {
  baselineSessionId: string | null;
}

const DEFAULTS: UiPrefs = {
  baselineSessionId: null,
};

function getAll(): UiPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function setAll(prefs: UiPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota or unavailable — silently ignore */
  }
}

export const uiPrefs = {
  get(): UiPrefs {
    return getAll();
  },

  set(partial: Partial<UiPrefs>): void {
    setAll({ ...getAll(), ...partial });
  },

  getBaselineSessionId(): string | null {
    return getAll().baselineSessionId;
  },

  setBaselineSessionId(id: string | null): void {
    this.set({ baselineSessionId: id });
  },
};
