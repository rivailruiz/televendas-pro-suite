import { pedidos } from '@/mocks/data';
import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';

export interface OrderItemUI {
  produtoId: number;
  descricao: string;
  av: number;
  un: string;
  c: number;
  quant: number;
  descontoPerc: number;
  preco: number;
  liquido: number;
  total: number;
  obs?: string;
}

export interface Order {
  id: number;
  data: string;
  operacao: string;
  clienteId: number;
  clienteNome: string;
  representanteId: string;
  representanteNome: string;
  tabela: string;
  formaPagamento: string;
  prazo: string;
  boleto: boolean;
  rede: string;
  especial: boolean;
  situacao: string;
  valor: number;
  itens: OrderItemUI[];
  totais: {
    bruto: number;
    descontos: number;
    descontosPerc: number;
    icmsRepasse: number;
    liquido: number;
  };
  observacaoCliente?: string;
  observacaoPedido?: string;
  observacaoNF?: string;
  transmitido?: boolean;
}


export const ordersService = {
  list: async (filters?: any, _page: number = 1, _limit: number = 100) => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      // Map known filters to API params
      if (filters) {
        if (filters.representante) params.set('representante', String(filters.representante));
        // Accept both 'pedidoIds' and legacy 'pedidos'
        const pedidoIds = filters.pedidoIds ?? filters.pedidos;
        if (pedidoIds) params.set('pedidoIds', String(pedidoIds));
        if (filters.operacoes) params.set('operacoes', String(filters.operacoes));
        if (typeof filters.especial === 'boolean') params.set('especial', String(filters.especial));
        if (filters.situacao) params.set('situacao', String(filters.situacao));
        if (filters.dataInicio) params.set('dataInicio', String(filters.dataInicio));
        if (filters.dataFim) params.set('dataFim', String(filters.dataFim));
        if (filters.cliente) params.set('cliente', String(filters.cliente));
      }
      const url = `${API_BASE}/api/pedidos?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json', Authorization: `Bearer ${token}` };
      const res = await fetch(url, {
        method: 'GET',
        headers,
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
        transmitido: Boolean(p?.transmitido ?? false),
      }));

      return normalized;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
  // Detalhe do pedido via API (para edição/visualização)
  getById: async (id: number): Promise<Order> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');
    try {
      const url = `${API_BASE}/api/pedidos/${encodeURIComponent(id)}?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = { accept: 'application/json', Authorization: `Bearer ${token}` };
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar pedido';
        try { const err = await res.json(); message = err?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      const p: any = await res.json();
      const order: Order = {
        id: p?.id ?? p?.pedido_id ?? id,
        data: p?.data ?? new Date().toISOString().split('T')[0],
        operacao: p?.operacao ?? '',
        clienteId: p?.clienteId ?? p?.cliente_id ?? 0,
        clienteNome: p?.clienteNome ?? p?.cliente_nome ?? '',
        representanteId: p?.representanteId ?? p?.representante_id ?? '',
        representanteNome: p?.representanteNome ?? p?.representante_nome ?? '',
        tabela: p?.tabela ?? p?.tabela_preco ?? '',
        formaPagamento: p?.formaPagamento ?? p?.forma_pagamento ?? '',
        prazo: p?.prazo ?? p?.prazo_pagamento ?? '',
        boleto: Boolean(p?.boleto ?? false),
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
        transmitido: Boolean(p?.transmitido ?? false),
      };
      return order;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  create: async (order: any) => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    // Constrói itens conforme a tabela vendas_itens
    const buildItens = (uiItens: any[]): any[] => {
      const itens = Array.isArray(uiItens) ? uiItens : [];
      return itens.map((it: any, idx: number) => {
        const produto_id = it?.produtoId ?? it?.produto_id ?? it?.id;
        const quantidade = Number(it?.quant ?? it?.quantidade ?? 0) || 0;
        const preco_tabela = Number(it?.preco ?? it?.preco_tabela ?? 0) || 0;
        const percentual_desconto = Number(it?.descontoPerc ?? it?.percentual_desconto ?? 0) || 0;
        const valor_bruto = Number(it?.valor_bruto_calc ?? (preco_tabela * quantidade)) || 0;
        const preco_unitario = quantidade > 0
          ? Number(it?.liquido ?? (it?.total / quantidade) ?? 0) || 0
          : 0;
        const valor_liquido = Number(it?.total ?? (preco_unitario * quantidade)) || 0;
        const valor_desconto = Math.max(0, valor_bruto - valor_liquido);
        const tabela_preco_id_raw = it?.tabela_preco_id ?? it?.tabelaId ?? order?.tabela;
        const tabela_preco_id = tabela_preco_id_raw != null ? Number(tabela_preco_id_raw) || 0 : 0;

        return {
          empresa_id: empresa.empresa_id,
          pedido_id: 0, // definido no backend ao persistir o pedido
          produto_id: Number(produto_id) || 0,
          ordem: Number(it?.ordem ?? idx + 1) || (idx + 1),
          tabela_preco_id,
          quantidade,
          preco_tabela,
          percentual_desconto,
          preco_unitario,
          valor_bruto,
          valor_desconto,
          valor_icms_repasse: Number(it?.valor_icms_repasse ?? 0) || 0,
          rateio_desconto_do_pedido: Number(it?.rateio_desconto_do_pedido ?? 0) || 0,
          rateio_despesas: Number(it?.rateio_despesas ?? 0) || 0,
          rateio_frete: Number(it?.rateio_frete ?? 0) || 0,
          valor_liquido,
          peso_bruto: Number(it?.peso_bruto ?? 0) || 0,
          peso_liquido: Number(it?.peso_liquido ?? 0) || 0,
          corte: Number(it?.corte ?? 0) || 0,
          obs: it?.obs ? String(it.obs) : undefined,
        };
      });
    };

    // Monta payload para API de pedidos
    const payload: any = {
      empresaId: empresa.empresa_id,
      data: order?.data,
      operacao: order?.operacao,
      clienteId: order?.clienteId,
      representanteId: order?.representanteId,
      tabela: order?.tabela,
      formaPagamento: order?.formaPagamento,
      prazo: order?.prazo,
      boleto: Boolean(order?.boleto ?? false),
      rede: order?.rede,
      valor: order?.valor,
      observacoes: order?.observacoes,
      itens: buildItens(order?.itens),
    };

    try {
      const url = `${API_BASE}/api/pedidos`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        let message = 'Falha ao criar pedido';
        try { const err = await res.json(); message = err?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      // Fallback para mock em caso de ambiente offline
      const newOrder: Order = {
        ...order,
        id: Math.max(...pedidos.map(p => p.id)) + 1,
        transmitido: false,
      };
      pedidos.push(newOrder);
      return newOrder;
    }
  },

  update: async (id: number, order: any) => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    // Reusa o mesmo mapeamento de itens do create
    const buildItens = (uiItens: any[]): any[] => {
      const itens = Array.isArray(uiItens) ? uiItens : [];
      return itens.map((it: any, idx: number) => {
        const produto_id = it?.produtoId ?? it?.produto_id ?? it?.id;
        const quantidade = Number(it?.quant ?? it?.quantidade ?? 0) || 0;
        const preco_tabela = Number(it?.preco ?? it?.preco_tabela ?? 0) || 0;
        const percentual_desconto = Number(it?.descontoPerc ?? it?.percentual_desconto ?? 0) || 0;
        const valor_bruto = Number(it?.valor_bruto_calc ?? (preco_tabela * quantidade)) || 0;
        const preco_unitario = quantidade > 0
          ? Number(it?.liquido ?? (it?.total / quantidade) ?? 0) || 0
          : 0;
        const valor_liquido = Number(it?.total ?? (preco_unitario * quantidade)) || 0;
        const valor_desconto = Math.max(0, valor_bruto - valor_liquido);
        const tabela_preco_id_raw = it?.tabela_preco_id ?? it?.tabelaId ?? order?.tabela;
        const tabela_preco_id = tabela_preco_id_raw != null ? Number(tabela_preco_id_raw) || 0 : 0;

        return {
          empresa_id: empresa.empresa_id,
          pedido_id: id,
          produto_id: Number(produto_id) || 0,
          ordem: Number(it?.ordem ?? idx + 1) || (idx + 1),
          tabela_preco_id,
          quantidade,
          preco_tabela,
          percentual_desconto,
          preco_unitario,
          valor_bruto,
          valor_desconto,
          valor_icms_repasse: Number(it?.valor_icms_repasse ?? 0) || 0,
          rateio_desconto_do_pedido: Number(it?.rateio_desconto_do_pedido ?? 0) || 0,
          rateio_despesas: Number(it?.rateio_despesas ?? 0) || 0,
          rateio_frete: Number(it?.rateio_frete ?? 0) || 0,
          valor_liquido,
          peso_bruto: Number(it?.peso_bruto ?? 0) || 0,
          peso_liquido: Number(it?.peso_liquido ?? 0) || 0,
          corte: Number(it?.corte ?? 0) || 0,
          obs: it?.obs ? String(it.obs) : undefined,
        };
      });
    };

    const payload: any = {
      empresaId: empresa.empresa_id,
      data: order?.data,
      operacao: order?.operacao,
      clienteId: order?.clienteId,
      representanteId: order?.representanteId,
      tabela: order?.tabela,
      formaPagamento: order?.formaPagamento,
      prazo: order?.prazo,
      boleto: Boolean(order?.boleto ?? false),
      rede: order?.rede,
      valor: order?.valor,
      observacoes: order?.observacoes,
      itens: buildItens(order?.itens),
    };

    try {
      const url = `${API_BASE}/api/pedidos/${encodeURIComponent(id)}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        let message = 'Falha ao atualizar pedido';
        try { const err = await res.json(); message = err?.message || err?.error || message; } catch {}
        return Promise.reject(message);
      }
      return res.json();
    } catch (e) {
      // Fallback: atualiza mock local
      const index = pedidos.findIndex(p => p.id === id);
      if (index !== -1) {
        pedidos[index] = { ...pedidos[index], ...order } as any;
        return pedidos[index] as any;
      }
      return Promise.reject('Pedido não encontrado');
    }
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
