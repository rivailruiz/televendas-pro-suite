import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';

export interface Representative {
  id: string; // normalized as string for UI compatibility
  nome: string;
}

function normalizeRepresentative(raw: any): Representative {
  const id =
    raw?.id ??
    raw?.representante_id ??
    raw?.codigo ??
    raw?.cod ??
    raw?.matricula ??
    '';
  const nome = raw?.nome ?? raw?.razao_social ?? raw?.fantasia ?? raw?.descricao ?? '';
  return {
    id: String(id ?? ''),
    nome: String(nome ?? '').trim(),
  };
}

async function fetchFromApi({ q, page = 1, limit = 100 }: { q?: string; page?: number; limit?: number; }): Promise<Representative[]> {
  const empresa = authService.getEmpresa();
  const token = authService.getToken();
  if (!empresa) return Promise.reject('Empresa não selecionada');

  const params = new URLSearchParams();
  params.set('empresaId', String(empresa.empresa_id));
  if (q) params.set('q', q);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));

  const url = `${API_BASE}/api/representantes?${params.toString()}`;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const useCookie = authService.isCookieAuth();

  try {
    const res = await fetch(url, { method: 'GET', headers, credentials: useCookie ? 'include' : 'omit' });
    if (!res.ok) {
      let message = 'Falha ao buscar representantes';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }
    const data = await res.json();
    const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return arr.map(normalizeRepresentative);
  } catch (e) {
    return Promise.reject('Erro de conexão com o servidor');
  }
}

export const representativesService = {
  find: async (query?: string, page = 1, limit = 100): Promise<Representative[]> => {
    return fetchFromApi({ q: query, page, limit });
  },
  search: async (query?: string, page = 1, limit = 100): Promise<Representative[]> => {
    return fetchFromApi({ q: query, page, limit });
  },
  getById: async (id: string): Promise<Representative | undefined> => {
    const list = await fetchFromApi({ q: String(id), page: 1, limit: 1 });
    return list.find((r) => r.id === id);
  },
};
