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
import { clientsService, type Client } from '@/services/clientsService';
import { authService } from '@/services/authService';
import { useStore } from '@/store/useStore';
import { situacoes } from '@/mocks/data';
import { metadataService, type Operacao } from '@/services/metadataService';
import { representativesService, type Representative } from '@/services/representativesService';
import { formatCurrency } from '@/utils/format';

interface PesquisaTabProps {
  onNavigateToDigitacao?: () => void;
}

export const PesquisaTab = ({ onNavigateToDigitacao }: PesquisaTabProps) => {
  const getTodayStr = () => new Date().toLocaleDateString('sv-SE');
  const { orders, selectedOrders, setOrders, toggleOrderSelection, clearSelection } = useStore();
  const [filters, setFilters] = useState({
    dataInicio: '2022-01-01',
    dataFim: getTodayStr(),
    situacao: 'Pendentes',
    especial: false,
    operacoes: '',
    pedidoIds: '',
    representante: '',
    cliente: '',
  });
  const [outputMode, setOutputMode] = useState<'video' | 'impressora'>('video');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [clienteNome, setClienteNome] = useState<string>('');
  
  // Operações (metadata)
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [loadingOperacoes, setLoadingOperacoes] = useState(false);
  const [operacoesError, setOperacoesError] = useState<string | null>(null);

  // Representantes para busca
  const [repSearchOpen, setRepSearchOpen] = useState(false);
  const [repSearch, setRepSearch] = useState('');
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loadingReps, setLoadingReps] = useState(false);
  const [repsError, setRepsError] = useState<string | null>(null);
  const [repPage, setRepPage] = useState(1);
  const [repHasMore, setRepHasMore] = useState(true);

  // Clientes para busca
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientPage, setClientPage] = useState(1);
  const [clientHasMore, setClientHasMore] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  // Carrega operações ao montar
  useEffect(() => {
    const loadOps = async () => {
      if (loadingOperacoes) return;
      setLoadingOperacoes(true);
      setOperacoesError(null);
      try {
        const ops = await metadataService.getOperacoes();
        setOperacoes(ops);
      } catch (e: any) {
        setOperacoesError(String(e));
      } finally {
        setLoadingOperacoes(false);
      }
    };
    loadOps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = async () => {
    // Evita chamada quando empresa não está selecionada (ex.: navegação/redirect em andamento)
    const empresa = authService.getEmpresa();
    if (!empresa) return;
    try {
      const data = await ordersService.list(filters);
      setOrders(data);
    } catch (e: any) {
      // Silencia rejeições esperadas na transição e registra no console
      console.warn('Falha ao carregar pedidos:', e);
    }
  };

  const handlePesquisar = () => {
    loadOrders();
  };

  const REP_LIMIT = 100;
  const loadReps = async (reset = false) => {
    if (loadingReps) return;
    setLoadingReps(true);
    setRepsError(null);
    try {
      const nextPage = reset ? 1 : repPage + 1;
      const data = await representativesService.find(repSearch || undefined, nextPage, REP_LIMIT);
      setRepresentatives((prev) => {
        const combined = reset ? data : [...prev, ...data];
        const seen = new Set<string>();
        return combined.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
      });
      setRepPage(nextPage);
      setRepHasMore(Array.isArray(data) && data.length === REP_LIMIT);
    } catch (e: any) {
      setRepsError(String(e));
    } finally {
      setLoadingReps(false);
    }
  };

  useEffect(() => {
    if (!repSearchOpen) return;
    loadReps(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repSearchOpen]);

  useEffect(() => {
    if (!repSearchOpen) return;
    const t = setTimeout(() => {
      loadReps(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repSearch]);

  // Clientes - busca e paginação
  const CLIENT_LIMIT = 100;
  const loadClients = async (reset = false) => {
    if (loadingClients) return;
    setLoadingClients(true);
    setClientsError(null);
    try {
      const nextPage = reset ? 1 : clientPage + 1;
      const data = await clientsService.find(clientSearch || undefined, nextPage, CLIENT_LIMIT);
      setClients((prev) => {
        const combined = reset ? data : [...prev, ...data];
        const seen = new Set<number>();
        return combined.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
      });
      setClientPage(nextPage);
      setClientHasMore(Array.isArray(data) && data.length === CLIENT_LIMIT);
    } catch (e: any) {
      setClientsError(String(e));
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (!clientSearchOpen) return;
    loadClients(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearchOpen]);

  useEffect(() => {
    if (!clientSearchOpen) return;
    const t = setTimeout(() => {
      loadClients(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearch]);

  const handleLimparFiltros = () => {
    setFilters({
      dataInicio: '2022-01-01',
      dataFim: getTodayStr(),
      situacao: 'Pendentes',
      especial: false,
      operacoes: '',
      pedidoIds: '',
      representante: '',
      cliente: '',
    });
    setClienteNome('');
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

        {/* Campo Usuário removido: não suportado pela API de pedidos */}

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
          <Select
            value={filters.operacoes}
            onValueChange={(v) => setFilters({ ...filters, operacoes: v === '__ALL__' ? '' : v })}
            disabled={loadingOperacoes || !!operacoesError}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingOperacoes ? 'Carregando...' : operacoesError ? 'Erro ao carregar' : 'Todas'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas</SelectItem>
              {operacoes
                .filter((op) => String(op.descricao || '').trim().length > 0 && String(op.codigo || '').trim().length > 0)
                .map((op) => (
                <SelectItem key={`${op.id}-${op.codigo}`} value={op.codigo}>
                  {op.codigo ? `${op.codigo} - ${op.descricao}` : op.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Pedido(s)</Label>
          <Input
            placeholder="IDs separados por vírgula"
            value={filters.pedidoIds}
            onChange={(e) => setFilters({ ...filters, pedidoIds: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Representante</Label>
          <Button variant="outline" className="w-full justify-start" onClick={() => setRepSearchOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            {filters.representante || 'Buscar representante'}
          </Button>
          <Dialog open={repSearchOpen} onOpenChange={setRepSearchOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buscar Representante</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Digite nome ou ID..."
                  value={repSearch}
                  onChange={(e) => setRepSearch(e.target.value)}
                  autoFocus
                />
                <div className="max-h-96 overflow-auto" onScroll={(e) => {
                  const el = e.currentTarget;
                  if (repHasMore && !loadingReps && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                    loadReps(false);
                  }
                }}>
                  {loadingReps ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Carregando representantes...</div>
                  ) : repsError ? (
                    <div className="py-6 text-center text-sm text-red-600">{repsError}</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Nome</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {representatives.map((r) => (
                          <TableRow
                            key={r.id}
                            className="cursor-pointer"
                            onClick={() => {
                              setFilters({ ...filters, representante: r.nome });
                              setRepSearchOpen(false);
                              setRepSearch('');
                            }}
                          >
                            <TableCell>{r.id}</TableCell>
                            <TableCell>{r.nome}</TableCell>
                          </TableRow>
                        ))}
                        {representatives.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                              Nenhum representante encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          <Label>Cliente</Label>
          <Button variant="outline" className="w-full justify-start" onClick={() => setClientSearchOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            {clienteNome || (filters.cliente ? `Cliente #${filters.cliente}` : 'Buscar cliente')}
          </Button>
          <Dialog open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buscar Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Digite nome ou ID..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  autoFocus
                />
                <div className="max-h-96 overflow-auto" onScroll={(e) => {
                  const el = e.currentTarget;
                  if (clientHasMore && !loadingClients && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                    loadClients(false);
                  }
                }}>
                  {loadingClients ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Carregando clientes...</div>
                  ) : clientsError ? (
                    <div className="py-6 text-center text-sm text-red-600">{clientsError}</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Cidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients.map((client) => (
                          <TableRow
                            key={client.id}
                            className="cursor-pointer"
                            onClick={() => {
                              setFilters({ ...filters, cliente: String(client.id) });
                              setClienteNome(client.nome);
                              setClientSearchOpen(false);
                              setClientSearch('');
                            }}
                          >
                            <TableCell>{client.id}</TableCell>
                            <TableCell>{client.nome}</TableCell>
                            <TableCell>{client.cidade}</TableCell>
                          </TableRow>
                        ))}
                        {clients.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                              Nenhum cliente encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Campo Cliente removido: não presente na API fornecida */}
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
        <div className="max-h-[60vh] overflow-auto scrollbar-thin">
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
          {(() => {
            const single = getSingleSelectedOrder();
            const canAlterar = !!single && single.transmitido !== true;
            return (
              <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={!canAlterar}>
                <FileEdit className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Alterar</span>
                <span className="sm:hidden">Alterar</span>
              </Button>
            );
          })()}
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
