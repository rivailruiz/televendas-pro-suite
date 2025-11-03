export const getApiBase = (): string => {
  // Prefer build-time Vite env
  const envBase = (import.meta as any)?.env?.VITE_API_BASE;
  if (envBase && String(envBase).trim() !== '') return envBase;

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

export const shouldIncludeCredentialsForLogin = (): boolean => {
  try {
    const url = new URL(API_BASE);
    const host = url.hostname;
    // Em geral, produção (domínio público) usa cookie HttpOnly; localhost usa token
    if (host === 'localhost' || host === '127.0.0.1') return false;
    return true;
  } catch {
    return false;
  }
};
