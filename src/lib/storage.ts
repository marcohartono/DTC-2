const TECH_KEY = 'turfiq.tech';

export function loadTech(): string | null {
  try {
    return localStorage.getItem(TECH_KEY);
  } catch {
    return null;
  }
}

export function saveTech(tech: string): void {
  try {
    localStorage.setItem(TECH_KEY, tech);
  } catch {
    /* ignore */
  }
}

export function clearTech(): void {
  try {
    localStorage.removeItem(TECH_KEY);
  } catch {
    /* ignore */
  }
}
