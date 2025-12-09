import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface Client {
  id: number;
  codigoCliente?: string;
  nome: string;
  cidade: string;
  uf: string;
  bairro: string;
  fone?: string;
  contato?: string;
  formaPagtoId?: number | string | null;
  prazoPagtoId?: number | string | null;
  representanteId?: string;
  representanteNome?: string;
  representanteCodigo?: string;
  representantes?: Array<{
    id: string;
    codigoRepresentante?: string;
    nome?: string;
  }>;
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
  const codigoCliente =
    raw?.codigo_cliente ??
    raw?.codigoCliente ??
    raw?.codigo ??
    raw?.cod ??
    raw?.cliente_codigo ??
    raw?.clienteCod ??
    raw?.cliente_cod ??
    null;
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
  const prazoPagtoId = raw?.prazo_pagto_id ?? raw?.prazoPagtoId ?? null;
  const repObj = raw?.representante && typeof raw.representante === 'object' ? raw.representante : null;
  const representantesArr = Array.isArray(raw?.representantes) ? raw.representantes : [];
  const representantes = representantesArr
    .map((r: any) => {
      if (!r) return null;
      const rid = r.id ?? r.codigo_representante ?? r.codigo ?? r.cod ?? r.matricula ?? null;
      return {
        id: rid != null ? String(rid).trim() : '',
        codigoRepresentante: r.codigo_representante ?? r.codigoRepresentante ?? r.codigo ?? r.cod ?? r.matricula ?? undefined,
        nome: r.nome ? String(r.nome).trim() : undefined,
      };
    })
    .filter(Boolean) as Client['representantes'];
  const firstRep = representantes?.[0];
  const representanteId =
    raw?.representanteId ??
    raw?.representante_id ??
    raw?.representante ??
    repObj?.id ??
    repObj?.codigo ??
    repObj?.cod ??
    null;
  const representanteCodigo =
    raw?.codigo_representante ??
    raw?.codigoRepresentante ??
    raw?.representante_codigo ??
    raw?.representanteCod ??
    raw?.representante_cod ??
    repObj?.codigo_representante ??
    repObj?.codigoRepresentante ??
    repObj?.codigo ??
    repObj?.cod ??
    firstRep?.codigoRepresentante ??
    firstRep?.id ??
    representanteId ??
    null;
  const representanteNome = raw?.representanteNome ?? repObj?.nome ?? '';

  return {
    id: Number(id) || 0,
    codigoCliente: codigoCliente ? String(codigoCliente).trim() : undefined,
    nome: String(nome || '').trim(),
    cidade: String(cidade || '').trim(),
    uf: String(uf || '').trim(),
    bairro: String(bairro || '').trim(),
    fone: fone ? String(fone) : undefined,
    contato: contato ? String(contato) : undefined,
    formaPagtoId: typeof formaPagtoId === 'number' ? formaPagtoId : (formaPagtoId != null ? String(formaPagtoId) : null),
    prazoPagtoId: typeof prazoPagtoId === 'number' ? prazoPagtoId : (prazoPagtoId != null ? String(prazoPagtoId) : null),
    representanteId: representanteId != null ? String(representanteId).trim() : undefined,
    representanteCodigo: representanteCodigo ? String(representanteCodigo).trim() : undefined,
    representanteNome: representanteNome ? String(representanteNome).trim() : undefined,
    representantes,
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
    const qTrim = typeof q === 'string' ? q.trim() : '';
    const qUpper = qTrim ? qTrim.toUpperCase() : '';
    if (qUpper) {
      params.set('q', qUpper);
      // Backend espera filtro por codigo_cliente para buscas por código (não pelo id)
      const looksLikeCodigo = /^[0-9A-Za-z]+$/.test(qUpper);
      if (looksLikeCodigo) params.set('codigoCliente', qUpper);
    }
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const url = `${API_BASE}/api/clientes?${params.toString()}`;
    const headers: Record<string, string> = { accept: 'application/json' };
    const res = await apiClient.fetch(url, {
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
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, {
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
      };
      const res = await apiClient.fetch(url, {
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
      };
      const res = await apiClient.fetch(url, {
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
      const headers: Record<string, string> = { accept: 'application/json' };
      const res = await apiClient.fetch(url, {
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
