export const getApiBase = (): string => {
  // Prefer build-time Vite env
  const envBase = (import.meta as any)?.env?.VITE_API_BASE;
  // If explicitly set (even empty string), honor it. Empty string means same-origin
  if (typeof envBase === 'string') return String(envBase).trim();

  // Fallback for GitHub Pages if env was not injected
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (host.endsWith('github.io')) {
      return 'https://api.adsvendas.tecdisa.com.br';
    }
  }

  // Local default
  return 'http://localhost:3000';
};

export const API_BASE = getApiBase();
