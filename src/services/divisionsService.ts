import { apiClient } from '@/utils/apiClient';
import { API_BASE } from '@/utils/env';
import { authService } from '@/services/authService';

export interface Divisao {
  empresa_id: number;
  divisao_id: number;
  codigo_divisao?: string;
  grupo_id?: number;
  descricao_divisao: string;
  inativo?: boolean;
}

function normalizeDivisao(raw: any): Divisao {
  return {
    empresa_id: Number(raw?.empresa_id ?? raw?.empresaId ?? 0),
    divisao_id: Number(raw?.divisao_id ?? raw?.divisaoId ?? raw?.id ?? 0),
    codigo_divisao: raw?.codigo_divisao ?? raw?.codigoDivisao ?? undefined,
    grupo_id: raw?.grupo_id ?? raw?.grupoId ?? undefined,
    descricao_divisao: String(raw?.descricao_divisao ?? raw?.descricaoDivisao ?? raw?.descricao ?? '').trim(),
    inativo: Boolean(raw?.inativo ?? false),
  };
}

export const divisionsService = {
  async getAll(): Promise<Divisao[]> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;

    if (!empresaId) {
      console.warn('divisionsService.getAll: empresaId não encontrado');
      return [];
    }

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));

    try {
      const res = await apiClient.fetch(`${API_BASE}/api/divisoes?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
      const mapped = arr.map(normalizeDivisao).filter((d) => d.descricao_divisao);
      mapped.sort((a, b) =>
        a.descricao_divisao.localeCompare(b.descricao_divisao, 'pt-BR', {
          sensitivity: 'base',
          numeric: true,
        } as any)
      );
      return mapped;
    } catch (error) {
      console.error('Erro ao buscar divisões:', error);
      return [];
    }
  },
};
