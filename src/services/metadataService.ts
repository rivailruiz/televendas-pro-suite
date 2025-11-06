import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';

export interface Operacao {
  id: number | string;
  codigo: string;
  descricao: string;
  tipo?: string;
  tipoId?: string;
}

export interface Tabela {
  id: number | string;
  codigo?: string;
  descricao: string;
  prazoMedio?: number; // dias; 0 ou undefined = sem limite
  principal?: boolean;
}

function normalizeOperacao(raw: any): Operacao {
  const id = raw?.operacao_id ?? raw?.id ?? raw?.codigo ?? raw?.codigo_operacao ?? '';
  const codigo = raw?.codigo_operacao ?? raw?.codigo ?? String(id ?? '');
  const descricao =
    raw?.descricao_operacao ??
    raw?.descricao ??
    raw?.nome ??
    raw?.operacao ??
    '';
  const tipo = raw?.tipo ?? raw?.tipo_operacao ?? undefined;
  const tipoId = raw?.tipo_operacao_id ?? raw?.tipoId ?? undefined;

  return {
    id: typeof id === 'number' ? id : String(id ?? '').trim(),
    codigo: String(codigo ?? '').trim(),
    descricao: String(descricao ?? '').trim(),
    tipo: tipo ? String(tipo) : undefined,
    tipoId: tipoId ? String(tipoId) : undefined,
  };
}

export const metadataService = {
  getOperacoes: async (): Promise<Operacao[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      const url = `${API_BASE}/api/metadata/operacoes?${params.toString()}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar operações';
        try {
          const err = await res.json();
          message = err?.message || err?.error || message;
        } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const mapped: Operacao[] = arr.map(normalizeOperacao);
      // Sort by id ascending (numeric when possible, fallback to string compare)
      mapped.sort((a, b) => {
        const aNum = typeof a.id === 'number' ? a.id : Number(a.id);
        const bNum = typeof b.id === 'number' ? b.id : Number(b.id);
        const aIsNum = Number.isFinite(aNum);
        const bIsNum = Number.isFinite(bNum);
        if (aIsNum && bIsNum) return (aNum as number) - (bNum as number);
        const as = String(a.id ?? '');
        const bs = String(b.id ?? '');
        return as.localeCompare(bs, 'pt-BR', { numeric: true, sensitivity: 'base' } as any);
      });
      return mapped;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
  // Tabelas de preço para popular selects
  getTabelas: async (): Promise<Tabela[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    // Normaliza diferentes formatos de payload
    const normalizeTabela = (raw: any): Tabela => {
      if (raw == null) return { id: '', descricao: '' };
      if (typeof raw === 'string' || typeof raw === 'number') {
        const val = String(raw);
        return { id: val, descricao: val };
      }
      const id = raw?.tabela_preco_id ?? raw?.id ?? raw?.tabela_id ?? raw?.codigo ?? raw?.cod ?? '';
      const codigo = raw?.codigo_tabela_preco ?? raw?.codigo ?? raw?.sigla ?? undefined;
      const desc =
        raw?.descricao_tabela_preco ??
        raw?.descricao ??
        raw?.descricao_tabela ??
        raw?.descricaoTabela ??
        raw?.nome ??
        raw?.tabela ??
        '';
      return {
        id: typeof id === 'number' ? id : String(id || '').trim(),
        codigo: codigo ? String(codigo).trim() : undefined,
        descricao: String(desc || '').trim(),
        prazoMedio: Number(raw?.prazo_medio ?? 0) || 0,
        principal: Boolean(raw?.principal ?? false),
      };
    };

    try {
      const params = new URLSearchParams();
      params.set('empresaId', String(empresa.empresa_id));
      const url = `${API_BASE}/api/metadata/tabelas?${params.toString()}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar tabelas';
        try {
          const err = await res.json();
          message = err?.message || err?.error || message;
        } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const mapped = arr.map(normalizeTabela).filter((t) => String(t.descricao || '').length > 0);
      // Ordena por descricao asc, com código como desempate
      mapped.sort((a, b) => {
        const ad = String(a.descricao || '');
        const bd = String(b.descricao || '');
        const byDesc = ad.localeCompare(bd, 'pt-BR', { numeric: true, sensitivity: 'base' } as any);
        if (byDesc !== 0) return byDesc;
        const ac = String(a.codigo || a.id || '');
        const bc = String(b.codigo || b.id || '');
        return ac.localeCompare(bc, 'pt-BR', { numeric: true, sensitivity: 'base' } as any);
      });
      return mapped;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
  // Tabelas de preço por cliente
  getTabelasByCliente: async (clienteId: number): Promise<Tabela[]> => {
    const empresa = authService.getEmpresa();
    if (!empresa) return Promise.reject('Empresa não selecionada');
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    // Normaliza payload específico do endpoint de cliente
    const normalizeTabelaCliente = (raw: any): Tabela => {
      if (!raw) return { id: '', descricao: '' };
      const id = raw?.tabela_preco_id ?? raw?.id ?? raw?.tabela_id ?? raw?.codigo ?? raw?.cod ?? '';
      const codigo = raw?.codigo_tabela_preco ?? raw?.codigo ?? raw?.sigla ?? undefined;
      const desc =
        raw?.descricao_tabela_preco ??
        raw?.descricao ??
        raw?.descricao_tabela ??
        raw?.descricaoTabela ??
        raw?.nome ??
        raw?.tabela ??
        '';
      return {
        id: typeof id === 'number' ? id : String(id || '').trim(),
        codigo: codigo ? String(codigo).trim() : undefined,
        descricao: String(desc || '').trim(),
        prazoMedio: Number(raw?.prazo_medio ?? 0) || 0,
        principal: Boolean(raw?.principal ?? false),
      };
    };

    try {
      const url = `${API_BASE}/api/clientes/${encodeURIComponent(clienteId)}/tabelas-precos?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
      const headers: Record<string, string> = {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        let message = 'Falha ao buscar tabelas do cliente';
        try {
          const err = await res.json();
          message = err?.message || err?.error || message;
        } catch {}
        return Promise.reject(message);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const mapped = arr.map(normalizeTabelaCliente).filter((t) => String(t.descricao || '').trim().length > 0);
      // Ordena por principal desc, depois descricao asc, depois codigo/id
      mapped.sort((a, b) => {
        const ap = a.principal ? 1 : 0;
        const bp = b.principal ? 1 : 0;
        if (bp !== ap) return bp - ap; // principal primeiro
        const ad = String(a.descricao || '');
        const bd = String(b.descricao || '');
        const byDesc = ad.localeCompare(bd, 'pt-BR', { numeric: true, sensitivity: 'base' } as any);
        if (byDesc !== 0) return byDesc;
        const ac = String(a.codigo || a.id || '');
        const bc = String(b.codigo || b.id || '');
        return ac.localeCompare(bc, 'pt-BR', { numeric: true, sensitivity: 'base' } as any);
      });
      return mapped;
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },
};
