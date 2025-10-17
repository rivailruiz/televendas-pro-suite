import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, X, FileEdit, Trash2, Mail, Download, Printer, Video } from 'lucide-react';
import { ordersService } from '@/services/ordersService';
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

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-card rounded-lg border">
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
      <div className="flex gap-2">
        <Button onClick={handlePesquisar}>
          <Search className="h-4 w-4 mr-2" />
          Pesquisar
        </Button>
        <Button variant="outline" onClick={handleLimparFiltros}>
          <X className="h-4 w-4 mr-2" />
          Limpa filtros
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
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

      {/* Rodapé com ações */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onNavigateToDigitacao}>
            <FileEdit className="h-4 w-4 mr-2" />
            Digitar Pedido
          </Button>
          <Button variant="outline">
            <FileEdit className="h-4 w-4 mr-2" />
            Alterar
          </Button>
          <Button variant="outline" onClick={handleExcluir}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Enviar por e-mail
          </Button>
          <Button variant="outline" onClick={handleExportar}>
            <Download className="h-4 w-4 mr-2" />
            Exportar p/ faturamento
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={outputMode === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOutputMode('video')}
            >
              <Video className="h-4 w-4 mr-1" />
              Vídeo
            </Button>
            <Button
              variant={outputMode === 'impressora' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOutputMode('impressora')}
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
    </div>
  );
};
