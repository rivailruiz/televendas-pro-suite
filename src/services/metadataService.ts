import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';

export interface Operacao {
  id: number | string;
  codigo: string;
  descricao: string;
  tipo?: string;
  tipoId?: string;
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
};
