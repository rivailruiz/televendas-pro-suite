import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { authService } from '@/services/authService';
import { API_BASE } from '@/utils/env';
import { apiClient } from '@/utils/apiClient';
import { formatCurrency } from '@/utils/format';

export interface ProductPriceTableEntry {
  tabelaPrecoId: number | string;
  codigoTabela?: string;
  descricaoTabela: string;
  preco: number;
  desconto: number;
  comissao: number;
  pvsM: number; // Preço venda sugerido modificado
  dc?: boolean; // Desconto Campanha
  bdf?: boolean; // Bonificação / Desconto Financeiro
  ae?: boolean; // Ativo/Elegível
}

interface ProductPriceTablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productDescription?: string;
  data: ProductPriceTableEntry[];
}

export async function fetchProductPriceTables(produtoId: number): Promise<ProductPriceTableEntry[]> {
  const empresa = authService.getEmpresa();
  if (!empresa) return Promise.reject('Empresa não selecionada');
  const token = authService.getToken();
  if (!token) return Promise.reject('Token ausente');

  try {
    const url = `${API_BASE}/api/produtos/${encodeURIComponent(produtoId)}/tabelas-precos?empresaId=${encodeURIComponent(empresa.empresa_id)}`;
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    const res = await apiClient.fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      let message = 'Erro ao buscar tabelas de preço do produto';
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {}
      return Promise.reject(message);
    }
    const data = await res.json();
    const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    
    return arr.map((raw: any): ProductPriceTableEntry => {
      const id = raw?.tabela_preco_id ?? raw?.id ?? raw?.tabela_id ?? '';
      const codigo = raw?.codigo_tabela_preco ?? raw?.codigoTabelaPreco ?? raw?.codigo ?? raw?.sigla ?? undefined;
      const desc =
        raw?.descricao_tabela_preco ??
        raw?.descricaoTabelaPreco ??
        raw?.descricao ??
        raw?.descricao_tabela ??
        raw?.descricaoTabela ??
        raw?.nome ??
        raw?.tabela ??
        '';
      const preco = Number(raw?.preco ?? raw?.preco_tabela ?? raw?.precoTabela ?? 0) || 0;
      const desconto = Number(raw?.desconto ?? raw?.desconto_maximo ?? raw?.descontoMaximo ?? 0) || 0;
      const comissao = Number(raw?.comissao ?? raw?.percentual_comissao ?? raw?.percentualComissao ?? 0) || 0;
      const pvsM = Number(raw?.pvs_m ?? raw?.pvsM ?? raw?.preco_venda_sugerido ?? raw?.precoVendaSugerido ?? preco) || 0;
      
      return {
        tabelaPrecoId: typeof id === 'number' ? id : String(id || '').trim(),
        codigoTabela: codigo ? String(codigo).trim() : undefined,
        descricaoTabela: String(desc || '').trim(),
        preco,
        desconto,
        comissao,
        pvsM,
        dc: Boolean(raw?.dc ?? raw?.desconto_campanha ?? raw?.descontoCampanha ?? false),
        bdf: Boolean(raw?.bdf ?? raw?.bonificacao ?? raw?.desconto_financeiro ?? raw?.descontoFinanceiro ?? false),
        ae: Boolean(raw?.ae ?? raw?.ativo ?? raw?.elegivel ?? true),
      };
    }).filter((entry: ProductPriceTableEntry) => entry.descricaoTabela.length > 0);
  } catch (e) {
    return Promise.reject('Erro de conexão ao buscar tabelas de preço');
  }
}

export const ProductPriceTablesModal = ({
  open,
  onOpenChange,
  productDescription,
  data,
}: ProductPriceTablesModalProps) => {
  const formatNumber = (value: number, decimals = 4) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            Tabelas de Preços
            {productDescription && (
              <span className="ml-2 font-normal text-sm text-muted-foreground">
                - {productDescription}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-lg">
          {data.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma tabela de preço encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px] text-xs font-semibold">C</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[180px]">Descrição</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[90px]">Preço</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[80px]">Desconto</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[80px]">Comissão</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[80px]">Pvs-M</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-[40px]">Dc</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-[40px]">Bdf</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-[40px]">Ae</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry, idx) => (
                  <TableRow key={`${entry.tabelaPrecoId}-${idx}`} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono py-1.5">
                      {entry.codigoTabela || String(entry.tabelaPrecoId).charAt(0).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-xs py-1.5">{entry.descricaoTabela}</TableCell>
                    <TableCell className="text-xs text-right py-1.5 font-mono">
                      {formatNumber(entry.preco)}
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5 font-mono">
                      {formatNumber(entry.desconto, 3)}
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5 font-mono">
                      {formatNumber(entry.comissao, 3)}
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5 font-mono">
                      {formatNumber(entry.pvsM)}
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      <Checkbox checked={entry.dc} disabled className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      <Checkbox checked={entry.bdf} disabled className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      <Checkbox checked={entry.ae} disabled className="h-4 w-4" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
