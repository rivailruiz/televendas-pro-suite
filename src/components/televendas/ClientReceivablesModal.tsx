import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { receivablesService, type Receivable } from '@/services/receivablesService';
import { formatCurrency } from '@/utils/format';

interface ClientReceivablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: number;
}

type Situacao = 'a_receber' | 'recebido' | 'todos';
type Ordem = 'vencto' | 'valor' | 'atraso';

export const ClientReceivablesModal = ({ open, onOpenChange, clienteId }: ClientReceivablesModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Receivable[]>([]);
  const [situacao, setSituacao] = useState<Situacao>('a_receber');
  const [ordem, setOrdem] = useState<Ordem>('vencto');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open || !clienteId) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSelectedIds(new Set());
      try {
        const result = await receivablesService.getByClienteId(clienteId, {
          situacao: situacao === 'todos' ? undefined : situacao,
          ordem,
        });
        setData(result);
      } catch (e: any) {
        setError(String(e) || 'Erro ao carregar contas a receber');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, clienteId, situacao, ordem]);

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Sort data based on ordem
  const sortedData = [...data].sort((a, b) => {
    switch (ordem) {
      case 'vencto':
        return (a.vencimento || '').localeCompare(b.vencimento || '');
      case 'valor':
        return (b.valor || 0) - (a.valor || 0);
      case 'atraso':
        return (b.atraso || 0) - (a.atraso || 0);
      default:
        return 0;
    }
  });

  // Calculate totals
  const totalSelecionado = sortedData
    .filter(r => selectedIds.has(r.id))
    .reduce((sum, r) => sum + (r.saldo || 0), 0);

  const totalGeral = sortedData.reduce((sum, r) => sum + (r.saldo || 0), 0);

  // Calculate "corrigido" - sum of saldos for items with atraso > 0
  const totalCorrigido = sortedData
    .filter(r => (r.atraso || 0) > 0)
    .reduce((sum, r) => sum + (r.saldo || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Conta a Receber</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">{error}</div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Table */}
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">sel</TableHead>
                    <TableHead className="w-16">Tipo</TableHead>
                    <TableHead className="w-24">Numero</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-20">Cliente</TableHead>
                    <TableHead className="w-16">Local</TableHead>
                    <TableHead className="w-14">cond</TableHead>
                    <TableHead className="w-24">Vencto</TableHead>
                    <TableHead className="w-24 text-right">Valor</TableHead>
                    <TableHead className="w-24 text-right">Saldo</TableHead>
                    <TableHead className="w-24">Dt. Pagto</TableHead>
                    <TableHead className="w-16 text-right">Atraso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.length > 0 ? (
                    sortedData.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className={selectedIds.has(item.id) ? 'bg-primary/10' : ''}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => handleToggleSelect(item.id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{item.tipo}</TableCell>
                        <TableCell className="text-xs">{item.numero}</TableCell>
                        <TableCell className="text-xs truncate max-w-[200px]">{item.nome}</TableCell>
                        <TableCell className="text-xs">{item.clienteCodigo}</TableCell>
                        <TableCell className="text-xs">{item.local}</TableCell>
                        <TableCell className="text-xs">{item.cond}</TableCell>
                        <TableCell className="text-xs">{formatDate(item.vencimento)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(item.valor || 0)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(item.saldo || 0)}</TableCell>
                        <TableCell className="text-xs">{formatDate(item.dataPagamento)}</TableCell>
                        <TableCell className={`text-xs text-right ${(item.atraso || 0) > 0 ? 'text-destructive font-medium' : ''}`}>
                          {item.atraso || 0}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">
                        Nenhuma conta a receber encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer with filters and totals */}
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t pt-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Situação</label>
                  <Select value={situacao} onValueChange={(v) => setSituacao(v as Situacao)}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_receber">A receber</SelectItem>
                      <SelectItem value="recebido">Recebido</SelectItem>
                      <SelectItem value="todos">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Ordem</label>
                  <Select value={ordem} onValueChange={(v) => setOrdem(v as Ordem)}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vencto">Vencto</SelectItem>
                      <SelectItem value="valor">Valor</SelectItem>
                      <SelectItem value="atraso">Atraso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Totals */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Seleção</label>
                  <Input 
                    readOnly 
                    value={formatCurrency(totalSelecionado)} 
                    className="w-28 h-8 text-right bg-muted/30 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Total</label>
                  <Input 
                    readOnly 
                    value={formatCurrency(totalGeral)} 
                    className="w-28 h-8 text-right bg-muted/30 text-sm"
                  />
                </div>
                <Input 
                  readOnly 
                  value={formatCurrency(totalGeral)} 
                  className="w-28 h-8 text-right bg-primary/10 border-primary text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <div className="flex items-center gap-2">
                <label className="text-sm">Corrigido</label>
                <Input 
                  readOnly 
                  value={formatCurrency(totalCorrigido)} 
                  className="w-28 h-8 text-right bg-muted/30 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
