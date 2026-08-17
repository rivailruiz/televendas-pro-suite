import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface Operacao {
  operacao_id: number;
  codigo_operacao?: string;
  descricao_operacao: string;
  tipo: string;
  tipo_operacao_id: string;
}

export interface OperacaoFormData {
  codigo_operacao?: string;
  descricao_operacao: string;
  tipo: string;
  tipo_operacao_id: string;
}

export interface TipoOperacaoAdsErp {
  tipo_operacao_id: string;
  descricao_tipo_operacao: string;
}

function normalizeOperacao(raw: any): Operacao {
  return {
    operacao_id: raw.operacao_id ?? raw.id ?? 0,
    codigo_operacao: raw.codigo_operacao ?? raw.codigoOperacao ?? '',
    descricao_operacao: raw.descricao_operacao ?? raw.descricaoOperacao ?? raw.descricao ?? '',
    tipo: raw.tipo ?? '',
    tipo_operacao_id: raw.tipo_operacao_id ?? raw.tipoOperacaoId ?? '',
  };
}

async function getEmpresaId(): Promise<number> {
  const empresa = authService.getEmpresa();
  if (!empresa) throw new Error('Empresa não selecionada');
  return empresa.empresa_id;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const err = await res.json();
    return err?.message || err?.error?.message || err?.error || fallback;
  } catch {
    return fallback;
  }
}

export const operacoesService = {
  async getAll(
    query?: string,
    page = 1,
    limit = 100,
  ): Promise<{ data: Operacao[]; page: number; limit: number; total: number }> {
    const empresaId = await getEmpresaId();

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));

    const url = `${API_BASE}/api/operacoes/empresa/${empresaId}?${params.toString()}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) throw new Error(await parseError(res, 'Falha ao buscar operações'));

    const json = await res.json();
    const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return {
      data: arr.map(normalizeOperacao),
      page: json?.page ?? page,
      limit: json?.limit ?? limit,
      total: json?.total ?? arr.length,
    };
  },

  async getById(id: number): Promise<Operacao | null> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/operacoes/${id}?empresaId=${empresaId}`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(await parseError(res, 'Falha ao buscar operação'));
    }

    return normalizeOperacao(await res.json());
  },

  async create(data: OperacaoFormData): Promise<Operacao> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/operacoes`;
    const body = {
      empresaId,
      data: {
        descricao_operacao: data.descricao_operacao,
        codigo_operacao: data.codigo_operacao || undefined,
        tipo: data.tipo,
        tipo_operacao_id: data.tipo_operacao_id,
      },
    };

    const res = await apiClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(await parseError(res, 'Falha ao criar operação'));

    return normalizeOperacao(await res.json());
  },

  async update(id: number, data: Partial<OperacaoFormData>): Promise<Operacao> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/operacoes/${id}?empresaId=${empresaId}`;
    const body = { data };

    const res = await apiClient.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(await parseError(res, 'Falha ao atualizar operação'));

    return normalizeOperacao(await res.json());
  },

  async delete(id: number): Promise<void> {
    const empresaId = await getEmpresaId();
    const url = `${API_BASE}/api/operacoes/${id}?empresaId=${empresaId}`;

    const res = await apiClient.fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      throw new Error(await parseError(res, 'Falha ao excluir operação'));
    }
  },

  async getTiposAdsErp(): Promise<TipoOperacaoAdsErp[]> {
    const url = `${API_BASE}/api/metadata/tipos-operacao-ads-erp`;
    const res = await apiClient.fetch(url, { method: 'GET', headers: { accept: 'application/json' } });

    if (!res.ok) throw new Error(await parseError(res, 'Falha ao buscar tipos de operação'));

    const json = await res.json();
    return Array.isArray(json) ? json : [];
  },
};
