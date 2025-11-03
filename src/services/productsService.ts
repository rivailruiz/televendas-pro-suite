import { authService } from '@/services/authService';

const API_BASE = 'http://localhost:3000';

export interface Product {
  id: number;
  descricao: string;
  un: string;
  preco: number;
  categoria?: string;
}

function normalizeProduct(raw: any): Product {
  const id = raw?.id ?? raw?.produto_id ?? raw?.codigo ?? raw?.cod ?? 0;
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
  const categoria = raw?.categoria ?? raw?.categoria_codigo ?? raw?.categoriaCodigo ?? undefined;

  return {
    id: Number(id) || 0,
    descricao: String(descricao || '').trim(),
    un: String(un || '').trim() || 'UN',
    preco,
    categoria: categoria ? String(categoria) : undefined,
  };
}

async function fetchFromApi({ q, page = 1, limit = 100 }: { q?: string; page?: number; limit?: number; }): Promise<Product[]> {
  const empresa = authService.getEmpresa();
  const token = authService.getToken();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  if (!token) return Promise.reject('Token ausente');

  try {
    const params = new URLSearchParams();
    params.set('empresaId', String(empresa.empresa_id));
    if (q) params.set('q', q);
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const url = `${API_BASE}/api/produtos?${params.toString()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
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
};
