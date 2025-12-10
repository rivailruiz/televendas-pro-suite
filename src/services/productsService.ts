import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface Product {
  id: number;
  codigoProduto?: string;
  descricao: string;
  un: string;
  preco: number;
  estoque?: number;
  categoria?: string;
}

interface ProductTabelaPrecoResponse {
  produtoId: number;
  tabelaPrecoId: number;
  preco: number;
}

function normalizeProduct(raw: any): Product {
  const id = raw?.id ?? raw?.produto_id ?? raw?.codigo ?? raw?.cod ?? 0;
  const codigoProduto =
    raw?.codigo_produto ??
    raw?.codigoProduto ??
    raw?.produto_codigo ??
    raw?.produtoCod ??
    raw?.produto_cod ??
    null;
  const descricao =
    raw?.descricao ??
    raw?.descricao_produto ??
    raw?.descricaoProduto ??
    raw?.nome ??
    raw?.produto ??
    '';
  const un = raw?.un ?? raw?.unidade ?? raw?.unidad ?? raw?.uom ?? '';
  const precoRaw = raw?.preco ?? raw?.preco_tabela ?? raw?.precoTabela ?? raw?.price ?? raw?.valor;
  const preco = typeof precoRaw === 'number' ? precoRaw : Number(precoRaw || 0) || 0;
  const estoqueRaw = raw?.estoque ?? raw?.quantidade_estoque ?? raw?.saldo ?? raw?.saldo_estoque;
  const estoque = typeof estoqueRaw === 'number' ? estoqueRaw : estoqueRaw != null ? Number(estoqueRaw) : undefined;
  const categoria = raw?.categoria ?? raw?.categoria_codigo ?? raw?.categoriaCodigo ?? undefined;

  return {
    id: Number(id) || 0,
    codigoProduto: codigoProduto ? String(codigoProduto).trim() : undefined,
    descricao: String(descricao || '').trim(),
    un: String(un || '').trim() || 'UN',
    preco,
    estoque: typeof estoque === 'number' ? estoque : undefined,
    categoria: categoria ? String(categoria) : undefined,
  };
}

async function fetchFromApi({ q, page = 1, limit = 100 }: { q?: string; page?: number; limit?: number; }): Promise<Product[]> {
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
    const url = `${API_BASE}/api/produtos?${params.toString()}`;
    const headers: Record<string, string> = { accept: 'application/json' };
    const res = await apiClient.fetch(url, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      let message = 'Falha ao buscar produtos';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }

    const data = await res.json();
    const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return arr.map(normalizeProduct);
  } catch (e) {
    return Promise.reject('Erro de conexão com o servidor');
  }
}

async function fetchPrecoByTabela({
  produtoId,
  tabelaPrecoId,
}: {
  produtoId: number;
  tabelaPrecoId: number;
}): Promise<ProductTabelaPrecoResponse> {
  const empresa = authService.getEmpresa();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  const token = authService.getToken();
  if (!token) return Promise.reject('Token ausente');

  try {
    const params = new URLSearchParams();
    params.set('empresaId', String(empresa.empresa_id));
    params.set('tabelaPrecoId', String(tabelaPrecoId));

    const url = `${API_BASE}/api/produtos/${encodeURIComponent(
      produtoId,
    )}/preco?${params.toString()}`;
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    const res = await apiClient.fetch(url, { method: 'GET', headers });

    if (!res.ok) {
      let message = 'Erro ao buscar preço do produto';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }

    const data = await res.json();
    const produtoIdResp = Number(data?.produtoId ?? produtoId) || produtoId;
    const tabelaIdResp =
      Number(data?.tabelaPrecoId ?? tabelaPrecoId) || tabelaPrecoId;
    const precoResp = Number(data?.preco ?? 0) || 0;

    return {
      produtoId: produtoIdResp,
      tabelaPrecoId: tabelaIdResp,
      preco: precoResp,
    };
  } catch {
    return Promise.reject('Erro de conexão ao buscar preço do produto');
  }
}

export const productsService = {
  find: async (query?: string, page = 1, limit = 100): Promise<Product[]> => {
    return fetchFromApi({ q: query, page, limit });
  },
  search: async (query?: string, page = 1, limit = 100): Promise<Product[]> => {
    return fetchFromApi({ q: query, page, limit });
  },
  getById: async (id: number): Promise<Product | undefined> => {
    const list = await fetchFromApi({ q: String(id), page: 1, limit: 1 });
    return list.find((p) => p.id === id);
  },
  getPrecoByTabela: async (
    produtoId: number,
    tabelaPrecoId: number,
  ): Promise<number> => {
    const data = await fetchPrecoByTabela({ produtoId, tabelaPrecoId });
    return data.preco;
  },

  reserveEstoque: async (produtoId: number, quantidade: number): Promise<void> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    const url = `${API_BASE}/api/produtos/${encodeURIComponent(produtoId)}/estoque/reservar?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
    const headers: Record<string, string> = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = JSON.stringify({ quantidade_reservada: quantidade });
    const res = await apiClient.fetch(url, { method: 'POST', headers, body });
    if (!res.ok) {
      let message = 'Falha ao reservar estoque';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }
    await res.json();
  },
};
