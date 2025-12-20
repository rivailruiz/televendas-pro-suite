export const getApiBase = (): string => {
  // Fallback for GitHub Pages - check this FIRST
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (host.endsWith('github.io')) {
      return 'https://api.adsvendas.tecdisa.com.br';
    }
  }

  // Prefer build-time Vite env (only if non-empty)
  const envBase = (import.meta as any)?.env?.VITE_API_BASE;
  if (typeof envBase === 'string' && envBase.trim() !== '') {
    return envBase.trim();
  }

  // Local default
  return 'http://localhost:3000';
};

export const API_BASE = getApiBase();
