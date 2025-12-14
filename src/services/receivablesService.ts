import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';

export interface Receivable {
  id: number;
  tipo?: string;
  numero?: string;
  nome?: string;
  clienteId?: number;
  clienteCodigo?: string;
  local?: string;
  cond?: string;
  vencimento?: string;
  valor?: number;
  saldo?: number;
  dataPagamento?: string;
  atraso?: number;
  situacao?: string;
}

interface ReceivablesFilters {
  situacao?: string;
  ordem?: string;
}

function normalizeReceivable(raw: any): Receivable {
  return {
    id: raw?.id ?? raw?.titulo_id ?? raw?.tituloId ?? 0,
    tipo: raw?.tipo ?? raw?.tipo_titulo ?? raw?.tipoTitulo ?? '',
    numero: raw?.numero ?? raw?.numero_titulo ?? raw?.numeroTitulo ?? raw?.titulo ?? '',
    nome: raw?.nome ?? raw?.cliente_nome ?? raw?.clienteNome ?? raw?.razao_social ?? '',
    clienteId: raw?.cliente_id ?? raw?.clienteId ?? 0,
    clienteCodigo: raw?.cliente_codigo ?? raw?.clienteCodigo ?? raw?.codigo_cliente ?? '',
    local: raw?.local ?? raw?.filial ?? '',
    cond: raw?.cond ?? raw?.condicao ?? raw?.parcela ?? '',
    vencimento: raw?.vencimento ?? raw?.data_vencimento ?? raw?.dataVencimento ?? '',
    valor: raw?.valor ?? raw?.valor_titulo ?? raw?.valorTitulo ?? 0,
    saldo: raw?.saldo ?? raw?.saldo_devedor ?? raw?.saldoDevedor ?? 0,
    dataPagamento: raw?.data_pagamento ?? raw?.dataPagamento ?? raw?.dt_pagto ?? '',
    atraso: raw?.atraso ?? raw?.dias_atraso ?? raw?.diasAtraso ?? 0,
    situacao: raw?.situacao ?? raw?.status ?? '',
  };
}

export const receivablesService = {
  getByClienteId: async (clienteId: number, filters?: ReceivablesFilters): Promise<Receivable[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      params.set('clienteId', String(clienteId));
      
      if (filters?.situacao) params.set('situacao', filters.situacao);
      if (filters?.ordem) params.set('ordem', filters.ordem);

      const url = `${API_BASE}/api/contas-receber?${params.toString()}`;
      const headers: Record<string, string> = { accept: 'application/json' };
      
      const res = await apiClient.fetch(url, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        let message = 'Falha ao buscar contas a receber';
        try {
          const err = await res.json();
          message = err?.message ?? err?.error ?? message;
        } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      return arr.map(normalizeReceivable);
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
};
