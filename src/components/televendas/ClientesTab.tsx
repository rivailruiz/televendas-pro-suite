import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { clientsService, Client } from '@/services/clientsService';
import { operacoes } from '@/mocks/data';

export const ClientesTab = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    uf: '',
    cidade: '',
    bairro: '',
    todos: false
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOperacao, setSelectedOperacao] = useState('');

  useEffect(() => {
    loadClients();
  }, [filters]);

  const loadClients = async () => {
    const data = await clientsService.search(filters.search, {
      uf: filters.uf,
      cidade: filters.cidade,
      bairro: filters.bairro
    });
    setClients(data);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(clients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedClients([...selectedClients, id]);
    } else {
      setSelectedClients(selectedClients.filter(cId => cId !== id));
    }
  };

  const handleCadastrarPara = () => {
    if (selectedClients.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }
    setDialogOpen(true);
  };

  const handleConfirmCadastro = () => {
    if (!selectedOperacao) {
      toast.error('Selecione uma operação');
      return;
    }
    toast.success(`Criando pedidos para ${selectedClients.length} cliente(s) com operação: ${selectedOperacao}`);
    setDialogOpen(false);
    setSelectedClients([]);
  };

  const ufs = [...new Set(clients.map(c => c.uf))];
  const cidades = [...new Set(clients.map(c => c.cidade))];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Pesquisa</label>
              <Input 
                placeholder="Nome ou ID"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">UF</label>
              <Select value={filters.uf} onValueChange={(v) => setFilters({...filters, uf: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {ufs.map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cidade</label>
              <Select value={filters.cidade} onValueChange={(v) => setFilters({...filters, cidade: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {cidades.map(cidade => (
                    <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Bairro</label>
              <Input 
                placeholder="Bairro"
                value={filters.bairro}
                onChange={(e) => setFilters({...filters, bairro: e.target.value})}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="todos"
              checked={filters.todos}
              onCheckedChange={(checked) => setFilters({...filters, todos: checked as boolean})}
            />
            <label htmlFor="todos" className="text-sm font-medium">
              Mostrar todos os clientes
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clientes ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedClients.length === clients.length && clients.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{client.id}</TableCell>
                  <TableCell>{client.nome}</TableCell>
                  <TableCell>{client.cidade}</TableCell>
                  <TableCell>{client.uf}</TableCell>
                  <TableCell>{client.bairro}</TableCell>
                  <TableCell>{client.fone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleCadastrarPara} disabled={selectedClients.length === 0}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cadastrar para ({selectedClients.length})
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Pedido para Clientes Selecionados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Operação</label>
              <Select value={selectedOperacao} onValueChange={setSelectedOperacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a operação" />
                </SelectTrigger>
                <SelectContent>
                  {operacoes.map(op => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Será criado um pedido para cada um dos {selectedClients.length} cliente(s) selecionado(s).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmCadastro}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
