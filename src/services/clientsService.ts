import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';

export interface Client {
  id: number;
  nome: string;
  cidade: string;
  uf: string;
  bairro: string;
  fone?: string;
  contato?: string;
  formaPagtoId?: number | string | null;
}

function extractErrorMessage(err: any, fallback: string): string {
  try {
    if (!err) return fallback;
    // Common shapes: { message }, { error: string }, { error: { message } }
    if (typeof err === 'string') return err;
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.message === 'string') return err.message;

    // Zod-style details: error.details.fieldErrors / formErrors
    const details = err?.error?.details ?? err?.details;
    const fieldErrors = details?.fieldErrors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const values = Object.values(fieldErrors).flat().filter(Boolean) as any[];
      if (values.length) return String(values[0]);
    }
    const formErrors = details?.formErrors;
    if (Array.isArray(formErrors) && formErrors.length) {
      return String(formErrors[0]);
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function normalizeClient(raw: any): Client {
  // Try multiple common API field names and normalize to UI expectations
  const id = raw?.id ?? raw?.cliente_id ?? raw?.codigo ?? raw?.cod ?? 0;
  const nome =
    raw?.nome ??
    raw?.razao_social ??
    raw?.fantasia ??
    raw?.razaoSocial ??
    raw?.razao ??
    '';
  const cidade = raw?.cidade ?? raw?.municipio ?? raw?.city ?? '';
  const uf = raw?.uf ?? raw?.estado ?? raw?.state ?? '';
  const bairro = raw?.bairro ?? raw?.district ?? raw?.bairro_nome ?? '';
  const fone = raw?.fone ?? raw?.telefone ?? raw?.phone ?? '';
  const contato = raw?.contato ?? raw?.responsavel ?? raw?.contact ?? '';
  const formaPagtoId = raw?.forma_pagto_id ?? raw?.formaPagtoId ?? raw?.forma_pagto ?? null;

  return {
    id: Number(id) || 0,
    nome: String(nome || '').trim(),
    cidade: String(cidade || '').trim(),
    uf: String(uf || '').trim(),
    bairro: String(bairro || '').trim(),
    fone: fone ? String(fone) : undefined,
    contato: contato ? String(contato) : undefined,
    formaPagtoId: typeof formaPagtoId === 'number' ? formaPagtoId : (formaPagtoId != null ? String(formaPagtoId) : null),
  };
}

async function fetchFromApi({ q, page = 1, limit = 100 }: { q?: string; page?: number; limit?: number; }): Promise<Client[]> {
  const empresa = authService.getEmpresa();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  const token = authService.getToken();
  if (!token) return Promise.reject('Token ausente');

  try {
    const params = new URLSearchParams();
    params.set('empresaId', String(empresa.empresa_id));
    if (q) params.set('q', q);
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const url = `${API_BASE}/api/clientes?${params.toString()}`;
    const headers: Record<string, string> = { accept: 'application/json', Authorization: `Bearer ${token}` };
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      let message = 'Falha ao buscar clientes';
      try {
        const err = await res.json();
        message = extractErrorMessage(err, message);
      } catch {}
      return Promise.reject(message);
    }

    const data = await res.json();
    const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return arr.map(normalizeClient);
  } catch (e) {
    return Promise.reject('Erro de conexão com o servidor');
  }
}

export const clientsService = {
  // Server-side search with pagination
  find: async (query?: string, page = 1, limit = 100): Promise<Client[]> => {
    return fetchFromApi({ q: query, page, limit });
  },

  // Backwards-compatible search signature used elsewhere in the app
  search: async (query?: string, _filters?: any, page = 1, limit = 100): Promise<Client[]> => {
    return fetchFromApi({ q: query, page, limit });
  },

  // Convenience to get a single client by id using a server search
  getById: async (id: number): Promise<Client | undefined> => {
    const list = await fetchFromApi({ q: String(id), page: 1, limit: 1 });
    return list.find((c) => c.id === id);
  },

  // Detailed GET by id (raw object from API)
  getDetail: async (id: number): Promise<any> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const url = `${API_BASE}/api/clientes/${encodeURIComponent(id)}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = { accept: 'application/json', Authorization: `Bearer ${token}` };
      const res = await fetch(url, {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        let message = 'Falha ao buscar cliente';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Create new client
  create: async (data: {
    codigoCliente: string;
    cnpjCpf: string;
    nome: string;
    cep: string;
    cidadeId: number;
    uf: string;
    endereco: string;
    bairro: string;
    segmentoId: number;
    rotaId: number;
    formaPagtoId: number;
    prazoPagtoId: number;
  }): Promise<any> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const url = `${API_BASE}/api/clientes`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ empresaId: empresa.empresa_id, data }),
      });
      if (!res.ok) {
        let message = 'Falha ao criar cliente';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Update client
  update: async (
    id: number,
    data: Partial<{
      codigoCliente: string;
      cnpjCpf: string;
      nome: string;
      cep: string;
      cidadeId: number;
      uf: string;
      endereco: string;
      bairro: string;
      segmentoId: number;
      rotaId: number;
      formaPagtoId: number;
      prazoPagtoId: number;
    }>
  ): Promise<any> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const url = `${API_BASE}/api/clientes/${encodeURIComponent(id)}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ empresaId: empresa.empresa_id, data }),
      });
      if (!res.ok) {
        let message = 'Falha ao atualizar cliente';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  // Delete client
  remove: async (id: number): Promise<boolean> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    try {
      const url = `${API_BASE}/api/clientes/${encodeURIComponent(id)}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = { accept: 'application/json', Authorization: `Bearer ${token}` };
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        let message = 'Falha ao excluir cliente';
        try { const err = await res.json(); message = extractErrorMessage(err, message); } catch {}
        return Promise.reject(message);
      }
      return true;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
};
