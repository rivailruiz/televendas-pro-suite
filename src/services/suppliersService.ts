import { apiClient } from '@/utils/apiClient';
import { authService } from '@/services/authService';

export interface Fornecedor {
  fornecedor_id: number;
  nome_fornecedor: string;
  cnpj_cpf?: string;
  codigo_fornecedor?: string;
  fantasia?: string;
}

export interface FornecedorResponse {
  data: Fornecedor[];
  page: number;
  limit: number;
  total: number;
}

function normalizeFornecedor(raw: any): Fornecedor {
  return {
    fornecedor_id: raw?.fornecedor_id ?? raw?.id ?? 0,
    nome_fornecedor: raw?.nome_fornecedor?.trim() ?? '',
    cnpj_cpf: raw?.cnpj_cpf?.trim() ?? undefined,
    codigo_fornecedor: raw?.codigo_fornecedor?.trim() ?? undefined,
    fantasia: raw?.fantasia?.trim() ?? undefined,
  };
}

export const suppliersService = {
  async getAll(query?: string, page = 1, limit = 100): Promise<Fornecedor[]> {
    const empresa = authService.getEmpresa();
    const empresaId = empresa?.empresa_id;
    
    if (!empresaId) {
      console.warn('suppliersService.getAll: empresaId não encontrado');
      return [];
    }

    const params = new URLSearchParams();
    params.set('empresaId', String(empresaId));
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (query?.trim()) {
      params.set('q', query.trim());
    }

    try {
      const response = await apiClient.fetch(`/api/fornecedores?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json() as FornecedorResponse;
      
      if (result?.data && Array.isArray(result.data)) {
        return result.data.map(normalizeFornecedor);
      }
      
      // Fallback if response is an array directly
      if (Array.isArray(result)) {
        return (result as any[]).map(normalizeFornecedor);
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      return [];
    }
  },

  async getByEmpresa(empresaId: number, query?: string, page = 1, limit = 100): Promise<Fornecedor[]> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (query?.trim()) {
      params.set('q', query.trim());
    }

    try {
      const response = await apiClient.fetch(`/api/fornecedores/empresa/${empresaId}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json() as FornecedorResponse;
      
      if (result?.data && Array.isArray(result.data)) {
        return result.data.map(normalizeFornecedor);
      }
      
      if (Array.isArray(result)) {
        return (result as any[]).map(normalizeFornecedor);
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar fornecedores por empresa:', error);
      return [];
    }
  }
};
