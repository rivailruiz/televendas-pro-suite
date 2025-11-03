import { pedidos } from '@/mocks/data';
import { authService } from '@/services/authService';

export type Order = typeof pedidos[0];

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || 'http://localhost:3000';

export const ordersService = {
  list: async (_filters?: any, page: number = 1, limit: number = 100) => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    const useCookie = authService.isCookieAuth();

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      if (page) params.set('page', String(page));
      if (limit) params.set('limit', String(limit));
      const url = `${API_BASE}/api/pedidos?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(url, {
        method: 'GET',
        headers,
        credentials: useCookie ? 'include' : 'omit',
      });

      if (!res.ok) {
        let message = 'Falha ao buscar pedidos';
        try {
          const err = await res.json();
          message = err?.message || err?.error || message;
        } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      // Normalize API payload to UI Order type used across app
      const normalized: Order[] = arr.map((p: any) => ({
        id: p?.id ?? p?.pedido_id ?? p?.numero ?? 0,
        data: p?.data ?? p?.createdAt ?? new Date().toISOString().split('T')[0],
        operacao: p?.operacao ?? p?.operacaoNome ?? 'VENDA DE MERCADORIA',
        clienteId: p?.clienteId ?? p?.cliente_id ?? p?.cliente ?? 0,
        clienteNome: p?.clienteNome ?? p?.cliente_nome ?? p?.clienteRazao ?? '',
        representanteId: p?.representanteId ?? p?.representante_id ?? '017',
        representanteNome: p?.representanteNome ?? p?.representante_nome ?? 'REPRESENTANTE',
        tabela: p?.tabela ?? p?.tabela_preco ?? 'TABELA 01',
        formaPagamento: p?.formaPagamento ?? p?.forma_pagamento ?? 'BOLETO BANCARIO',
        prazo: p?.prazo ?? p?.prazo_pagamento ?? '30 DIAS',
        boleto: Boolean(p?.boleto ?? true),
        rede: p?.rede ?? '',
        especial: Boolean(p?.especial ?? false),
        situacao: p?.situacao ?? p?.status ?? 'Pendentes',
        valor: typeof p?.valor === 'number' ? p.valor : Number(p?.valor ?? p?.total ?? 0) || 0,
        itens: Array.isArray(p?.itens) ? p.itens : [],
        totais: p?.totais ?? {
          bruto: Number(p?.bruto ?? 0) || 0,
          descontos: Number(p?.descontos ?? 0) || 0,
          descontosPerc: Number(p?.descontosPerc ?? 0) || 0,
          icmsRepasse: Number(p?.icmsRepasse ?? 0) || 0,
          liquido: typeof p?.valor === 'number' ? p.valor : Number(p?.valor ?? p?.total ?? 0) || 0,
        },
        observacaoCliente: p?.observacaoCliente ?? '',
        observacaoPedido: p?.observacaoPedido ?? '',
        observacaoNF: p?.observacaoNF ?? '',
      }));

      return normalized;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  getById: (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    return Promise.resolve(pedido);
  },

  create: (order: Omit<Order, 'id'>) => {
    const newOrder = {
      ...order,
      id: Math.max(...pedidos.map(p => p.id)) + 1
    };
    pedidos.push(newOrder);
    return Promise.resolve(newOrder);
  },

  update: (id: number, order: Partial<Order>) => {
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) {
      pedidos[index] = { ...pedidos[index], ...order };
      return Promise.resolve(pedidos[index]);
    }
    return Promise.reject('Pedido não encontrado');
  },

  remove: (id: number) => {
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) {
      pedidos.splice(index, 1);
      return Promise.resolve(true);
    }
    return Promise.reject('Pedido não encontrado');
  },

  export: (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (pedido) {
      const dataStr = JSON.stringify(pedido, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedido_${id}_faturamento.json`;
      link.click();
      URL.revokeObjectURL(url);
      return Promise.resolve(true);
    }
    return Promise.reject('Pedido não encontrado');
  },

  duplicate: (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (pedido) {
      const newOrder = {
        ...pedido,
        id: Math.max(...pedidos.map(p => p.id)) + 1,
        data: new Date().toISOString().split('T')[0]
      };
      pedidos.push(newOrder);
      return Promise.resolve(newOrder);
    }
    return Promise.reject('Pedido não encontrado');
  }
};
