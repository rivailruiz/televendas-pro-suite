import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShoppingCart, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { clientsService, Client } from '@/services/clientsService';
import { operacoes } from '@/mocks/data';

export const ClientesTab = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    uf: 'all',
    cidade: 'all',
    bairro: '',
    todos: false
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOperacao, setSelectedOperacao] = useState('');

  // CRUD dialogs & state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    codigoCliente: '',
    cnpjCpf: '',
    nome: '',
    cep: '',
    cidadeId: 0,
    uf: '',
    endereco: '',
    bairro: '',
    segmentoId: 0,
    rotaId: 0,
    formaPagtoId: 0,
    prazoPagtoId: 0,
  });

  console.log('ClientesTab rendering', { clients });

  useEffect(() => {
    loadClients();
  }, [filters]);

  const loadClients = async () => {
    const data = await clientsService.search(filters.search, {
      uf: filters.uf !== 'all' ? filters.uf : undefined,
      cidade: filters.cidade !== 'all' ? filters.cidade : undefined,
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

  const openCreateDialog = () => {
    setFormError(null);
    setFormData({
      codigoCliente: '',
      cnpjCpf: '',
      nome: '',
      cep: '',
      cidadeId: 0,
      uf: '',
      endereco: '',
      bairro: '',
      segmentoId: 0,
      rotaId: 0,
      formaPagtoId: 0,
      prazoPagtoId: 0,
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setFormError(null);
    if (!formData.nome || !formData.cnpjCpf) {
      setFormError('Preencha Nome e CNPJ/CPF');
      return;
    }
    try {
      setFormLoading(true);
      await clientsService.create({
        ...formData,
        cidadeId: Number(formData.cidadeId) || 0,
        segmentoId: Number(formData.segmentoId) || 0,
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: Number(formData.formaPagtoId) || 0,
        prazoPagtoId: Number(formData.prazoPagtoId) || 0,
      });
      toast.success('Cliente criado com sucesso');
      setCreateOpen(false);
      setSelectedClients([]);
      loadClients();
    } catch (e: any) {
      setFormError(String(e));
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = async () => {
    if (selectedClients.length !== 1) {
      toast.error('Selecione exatamente um cliente para editar');
      return;
    }
    const id = selectedClients[0];
    setEditId(id);
    setFormError(null);
    setDetailLoading(true);
    setEditOpen(true);
    try {
      const detail = await clientsService.getDetail(id);
      // Try to map common fields; fallback to empty strings
      setFormData({
        codigoCliente: String(detail?.codigoCliente ?? detail?.codigo ?? detail?.cod ?? ''),
        cnpjCpf: String(detail?.cnpjCpf ?? detail?.cnpj ?? detail?.cpf ?? ''),
        nome: String(detail?.nome ?? detail?.razao_social ?? detail?.fantasia ?? ''),
        cep: String(detail?.cep ?? ''),
        cidadeId: Number(detail?.cidadeId ?? detail?.cidade_id ?? 0),
        uf: String(detail?.uf ?? detail?.estado ?? ''),
        endereco: String(detail?.endereco ?? detail?.logradouro ?? ''),
        bairro: String(detail?.bairro ?? ''),
        segmentoId: Number(detail?.segmentoId ?? 0),
        rotaId: Number(detail?.rotaId ?? 0),
        formaPagtoId: Number(detail?.formaPagtoId ?? 0),
        prazoPagtoId: Number(detail?.prazoPagtoId ?? 0),
      });
    } catch (e: any) {
      setFormError(String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!editId) return;
    setFormError(null);
    try {
      setFormLoading(true);
      await clientsService.update(editId, {
        ...formData,
        cidadeId: Number(formData.cidadeId) || 0,
        segmentoId: Number(formData.segmentoId) || 0,
        rotaId: Number(formData.rotaId) || 0,
        formaPagtoId: Number(formData.formaPagtoId) || 0,
        prazoPagtoId: Number(formData.prazoPagtoId) || 0,
      });
      toast.success('Cliente atualizado com sucesso');
      setEditOpen(false);
      setSelectedClients([]);
      loadClients();
    } catch (e: any) {
      setFormError(String(e));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedClients.length === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }
    try {
      for (const id of selectedClients) {
        await clientsService.remove(id);
      }
      toast.success(`${selectedClients.length} cliente(s) excluído(s)`);
      setSelectedClients([]);
      loadClients();
    } catch (e: any) {
      toast.error(String(e));
    }
  };

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
                placeholder="Nome ou código"
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
                  <SelectItem value="all">Todos</SelectItem>
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
                  <SelectItem value="all">Todas</SelectItem>
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
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Clientes ({clients.length})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" /> Novo
              </Button>
              <Button variant="outline" size="sm" onClick={openEditDialog} disabled={selectedClients.length !== 1}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={selectedClients.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-auto scrollbar-thin">
            <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedClients.length === clients.length && clients.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Código</TableHead>
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
                  <TableCell>{client.codigoCliente ?? ''}</TableCell>
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

      {/* Create Client */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Código</label>
              <Input value={formData.codigoCliente} onChange={(e) => setFormData({ ...formData, codigoCliente: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">CNPJ/CPF</label>
              <Input value={formData.cnpjCpf} onChange={(e) => setFormData({ ...formData, cnpjCpf: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-2 block">Nome</label>
              <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">CEP</label>
              <Input value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">UF</label>
              <Input value={formData.uf} onChange={(e) => setFormData({ ...formData, uf: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cidade ID</label>
              <Input type="number" value={formData.cidadeId} onChange={(e) => setFormData({ ...formData, cidadeId: parseInt(e.target.value || '0', 10) })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Bairro</label>
              <Input value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-2 block">Endereço</label>
              <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Segmento ID</label>
              <Input type="number" value={formData.segmentoId} onChange={(e) => setFormData({ ...formData, segmentoId: parseInt(e.target.value || '0', 10) })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Rota ID</label>
              <Input type="number" value={formData.rotaId} onChange={(e) => setFormData({ ...formData, rotaId: parseInt(e.target.value || '0', 10) })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Forma Pagto ID</label>
              <Input type="number" value={formData.formaPagtoId} onChange={(e) => setFormData({ ...formData, formaPagtoId: parseInt(e.target.value || '0', 10) })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Prazo Pagto ID</label>
              <Input type="number" value={formData.prazoPagtoId} onChange={(e) => setFormData({ ...formData, prazoPagtoId: parseInt(e.target.value || '0', 10) })} />
            </div>
          </div>
          {formError && <div className="text-sm text-red-600">{formError}</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={formLoading}>Cancelar</Button>
            <Button onClick={submitCreate} disabled={formLoading}>{formLoading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Carregando dados do cliente...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Código</label>
                  <Input value={formData.codigoCliente} onChange={(e) => setFormData({ ...formData, codigoCliente: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">CNPJ/CPF</label>
                  <Input value={formData.cnpjCpf} onChange={(e) => setFormData({ ...formData, cnpjCpf: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Nome</label>
                  <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">CEP</label>
                  <Input value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">UF</label>
                  <Input value={formData.uf} onChange={(e) => setFormData({ ...formData, uf: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Cidade ID</label>
                  <Input type="number" value={formData.cidadeId} onChange={(e) => setFormData({ ...formData, cidadeId: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Bairro</label>
                  <Input value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Endereço</label>
                  <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Segmento ID</label>
                  <Input type="number" value={formData.segmentoId} onChange={(e) => setFormData({ ...formData, segmentoId: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Rota ID</label>
                  <Input type="number" value={formData.rotaId} onChange={(e) => setFormData({ ...formData, rotaId: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Forma Pagto ID</label>
                  <Input type="number" value={formData.formaPagtoId} onChange={(e) => setFormData({ ...formData, formaPagtoId: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Prazo Pagto ID</label>
                  <Input type="number" value={formData.prazoPagtoId} onChange={(e) => setFormData({ ...formData, prazoPagtoId: parseInt(e.target.value || '0', 10) })} />
                </div>
              </div>
              {formError && <div className="text-sm text-red-600">{formError}</div>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={formLoading}>Cancelar</Button>
                <Button onClick={submitEdit} disabled={formLoading}>{formLoading ? 'Salvando...' : 'Salvar'}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
