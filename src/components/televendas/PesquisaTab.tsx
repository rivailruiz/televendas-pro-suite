import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, X, FileEdit, Trash2, Mail, Download, Printer, File } from 'lucide-react';
import { ordersService, type Order } from '@/services/ordersService';
import { useStore } from '@/store/useStore';
import { situacoes } from '@/mocks/data';
import { formatCurrency } from '@/utils/format';

interface PesquisaTabProps {
  onNavigateToDigitacao?: () => void;
}

export const PesquisaTab = ({ onNavigateToDigitacao }: PesquisaTabProps) => {
  const { orders, selectedOrders, setOrders, toggleOrderSelection, clearSelection } = useStore();
  const [filters, setFilters] = useState({
    dataInicio: '2022-01-01',
    dataFim: '2025-10-17',
    usuario: 'ALEX',
    situacao: 'Pendentes',
    especial: false,
    operacoes: '',
    pedidos: '',
    representante: '',
    cliente: ''
  });
  const [outputMode, setOutputMode] = useState<'video' | 'impressora'>('video');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const data = await ordersService.list(filters);
    setOrders(data);
  };

  const handlePesquisar = () => {
    loadOrders();
  };

  const handleLimparFiltros = () => {
    setFilters({
      dataInicio: '2022-01-01',
      dataFim: '2025-10-17',
      usuario: 'ALEX',
      situacao: 'Pendentes',
      especial: false,
      operacoes: '',
      pedidos: '',
      representante: '',
      cliente: ''
    });
    clearSelection();
  };

  const handleExcluir = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }

    try {
      for (const id of selectedOrders) {
        await ordersService.remove(id);
      }
      toast.success(`${selectedOrders.length} pedido(s) excluído(s)`);
      clearSelection();
      loadOrders();
    } catch (error) {
      toast.error('Erro ao excluir pedidos');
    }
  };

  const handleExportar = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }

    try {
      for (const id of selectedOrders) {
        await ordersService.export(id);
      }
      toast.success('Pedidos exportados para faturamento');
    } catch (error) {
      toast.error('Erro ao exportar pedidos');
    }
  };

  const totalSelecionado = orders
    .filter(o => selectedOrders.includes(o.id))
    .reduce((sum, o) => sum + o.valor, 0);

  const selectAll = selectedOrders.length === orders.length && orders.length > 0;

  const getSingleSelectedOrder = (): Order | null => {
    if (selectedOrders.length !== 1) return null;
    const id = selectedOrders[0];
    return orders.find(o => o.id === id) || null;
  };

  const handleVisualizar = () => {
    const order = getSingleSelectedOrder();
    if (!order) {
      toast.error('Selecione exatamente um pedido para visualizar');
      return;
    }
    setPreviewOrder(order);
    setPreviewOpen(true);
  };

  const buildPrintableHtml = (order: Order) => {
    const rows = (order.itens || [])
      .map(
        (it) => `
          <tr>
            <td>${it.produtoId ?? ''}</td>
            <td>${String(it.descricao ?? '')}</td>
            <td>${String(it.un ?? '')}</td>
            <td style="text-align:right;">${Number(it.quant ?? 0)}</td>
            <td style="text-align:right;">${(Number(it.descontoPerc ?? 0)).toFixed(2)}%</td>
            <td style="text-align:right;">${formatCurrency(it.preco ?? 0)}</td>
            <td style="text-align:right; font-weight:600;">${formatCurrency(it.total ?? 0)}</td>
          </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pedido ${order.id}</title>
        <style>
          body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 18px; margin: 0 0 8px; }
          .meta { margin-bottom: 12px; font-size: 12px; color: #6B7280; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border-bottom: 1px solid #E5E7EB; padding: 6px 8px; }
          th { text-align: left; background: #F9FAFB; }
          .totais { margin-top: 16px; font-size: 14px; }
          .totais div { display: flex; justify-content: space-between; padding: 4px 0; }
          .bold { font-weight: 700; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Pedido #${order.id}</h1>
        <div class="meta">
          <div>Data: ${new Date(order.data).toLocaleDateString('pt-BR')}</div>
          <div>Cliente: ${order.clienteNome ?? ''} (${order.clienteId ?? ''})</div>
          <div>Operação: ${order.operacao ?? ''}</div>
          <div>Representante: ${order.representanteNome ?? ''}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Descrição</th>
              <th>UN</th>
              <th style="text-align:right;">Quant.</th>
              <th style="text-align:right;">%Desc</th>
              <th style="text-align:right;">Preço</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" style="text-align:center; color:#6B7280;">Sem itens</td></tr>'}
          </tbody>
        </table>
        <div class="totais">
          <div><span>Total Bruto:</span><span>${formatCurrency(order.totais?.bruto ?? order.valor ?? 0)}</span></div>
          <div><span>Descontos:</span><span>${formatCurrency(order.totais?.descontos ?? 0)} (${(order.totais?.descontosPerc ?? 0).toFixed?.(2) ?? 0}%)</span></div>
          <div class="bold"><span>Total do Pedido:</span><span>${formatCurrency(order.totais?.liquido ?? order.valor ?? 0)}</span></div>
        </div>
      </body>
      </html>`;
  };

  const handleImpressora = () => {
    const order = getSingleSelectedOrder();
    if (!order) {
      toast.error('Selecione exatamente um pedido para imprimir');
      return;
    }
    const html = buildPrintableHtml(order);
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Não foi possível abrir a janela de impressão');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    // Pequeno delay para garantir render antes de imprimir
    setTimeout(() => {
      try { win.print(); } catch {}
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg border">
        <div className="space-y-2">
          <Label>Período</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={filters.dataInicio}
              onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
            />
            <span className="self-center">a</span>
            <Input
              type="date"
              value={filters.dataFim}
              onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Usuário</Label>
          <Select value={filters.usuario} onValueChange={(v) => setFilters({ ...filters, usuario: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALEX">ALEX</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Situação</Label>
          <Select value={filters.situacao} onValueChange={(v) => setFilters({ ...filters, situacao: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {situacoes.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end space-x-2">
          <Checkbox
            id="especial"
            checked={filters.especial}
            onCheckedChange={(checked) => setFilters({ ...filters, especial: !!checked })}
          />
          <Label htmlFor="especial">Especial</Label>
        </div>

        <div className="space-y-2">
          <Label>Operações</Label>
          <Input
            value={filters.operacoes}
            onChange={(e) => setFilters({ ...filters, operacoes: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Pedidos</Label>
          <Input
            type="number"
            value={filters.pedidos}
            onChange={(e) => setFilters({ ...filters, pedidos: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Representante</Label>
          <Input
            value={filters.representante}
            onChange={(e) => setFilters({ ...filters, representante: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Cliente</Label>
          <Input
            type="number"
            value={filters.cliente}
            onChange={(e) => setFilters({ ...filters, cliente: e.target.value })}
          />
        </div>
      </div>

      {/* Botões de ação - filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handlePesquisar} className="w-full sm:w-auto">
          <Search className="h-4 w-4 mr-2" />
          Pesquisar
        </Button>
        <Button variant="outline" onClick={handleLimparFiltros} className="w-full sm:w-auto">
          <X className="h-4 w-4 mr-2" />
          Limpa filtros
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-table-header">
              <TableHead className="w-10">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      useStore.getState().setSelectedOrders(orders.map(o => o.id));
                    } else {
                      clearSelection();
                    }
                  }}
                />
              </TableHead>
              <TableHead>I</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                className={selectedOrders.includes(order.id) ? 'bg-table-selected' : 'hover:bg-table-hover'}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={() => toggleOrderSelection(order.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="w-4 h-4 bg-primary/20 rounded" />
                </TableCell>
                <TableCell>{new Date(order.data).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.operacao}</TableCell>
                <TableCell>{order.clienteId}</TableCell>
                <TableCell>{order.clienteNome}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(order.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Rodapé com ações */}
      <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg border">
        {/* Total - Primeira linha em mobile */}
        <div className="flex justify-between items-center sm:hidden border-b pb-3">
          <div>
            <div className="text-xl font-bold text-primary">{formatCurrency(totalSelecionado)}</div>
            <div className="text-xs text-muted-foreground">{selectedOrders.length} selecionado(s)</div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={outputMode === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={handleVisualizar}
            >
              <File className="h-4 w-4" />
            </Button>
            <Button
              variant={outputMode === 'impressora' ? 'default' : 'outline'}
              size="sm"
              onClick={handleImpressora}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Button variant="outline" onClick={onNavigateToDigitacao} size="sm" className="w-full sm:w-auto">
            <FileEdit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Digitar Pedido</span>
            <span className="sm:hidden">Digitar</span>
          </Button>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <FileEdit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Alterar</span>
            <span className="sm:hidden">Alterar</span>
          </Button>
          <Button variant="outline" onClick={handleExcluir} size="sm" className="w-full sm:w-auto">
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excluir</span>
            <span className="sm:hidden">Excluir</span>
          </Button>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Mail className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">E-mail</span>
            <span className="sm:hidden">E-mail</span>
          </Button>
          <Button variant="outline" onClick={handleExportar} size="sm" className="col-span-2 sm:col-span-1 sm:w-auto">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar p/ faturamento</span>
            <span className="sm:hidden">Exportar</span>
          </Button>
        </div>

        {/* Total e modo de saída - Desktop */}
        <div className="hidden sm:flex items-center justify-end gap-4 border-t pt-3">
          <div className="flex gap-2">
            <Button
              variant={outputMode === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={handleVisualizar}
            >
              <File className="h-4 w-4 mr-1" />
              Visualizar
            </Button>
            <Button
              variant={outputMode === 'impressora' ? 'default' : 'outline'}
              size="sm"
              onClick={handleImpressora}
            >
              <Printer className="h-4 w-4 mr-1" />
              Impressora
            </Button>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalSelecionado)}</div>
            <div className="text-xs text-muted-foreground">{selectedOrders.length} selecionado(s)</div>
          </div>
        </div>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewOrder ? `Pedido #${previewOrder.id}` : 'Pedido'}</DialogTitle>
          </DialogHeader>
          {previewOrder && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <div>Data: {new Date(previewOrder.data).toLocaleDateString('pt-BR')}</div>
                <div>Cliente: {previewOrder.clienteNome} ({previewOrder.clienteId})</div>
                <div>Operação: {previewOrder.operacao}</div>
                <div>Representante: {previewOrder.representanteNome}</div>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>UN</TableHead>
                      <TableHead className="text-right">Quant.</TableHead>
                      <TableHead className="text-right">%Desc</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(previewOrder.itens || []).map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{it.produtoId}</TableCell>
                        <TableCell>{it.descricao}</TableCell>
                        <TableCell>{it.un}</TableCell>
                        <TableCell className="text-right">{it.quant}</TableCell>
                        <TableCell className="text-right">{(it.descontoPerc ?? 0).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(it.preco)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(it.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between"><span>Total Bruto:</span><span>{formatCurrency(previewOrder.totais?.bruto ?? previewOrder.valor ?? 0)}</span></div>
                <div className="flex justify-between"><span>Descontos:</span><span>{formatCurrency(previewOrder.totais?.descontos ?? 0)} ({(previewOrder.totais?.descontosPerc ?? 0).toFixed(2)}%)</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total do Pedido:</span><span>{formatCurrency(previewOrder.totais?.liquido ?? previewOrder.valor ?? 0)}</span></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
                <Button onClick={() => { setPreviewOpen(false); handleImpressora(); }}>Imprimir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
