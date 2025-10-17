import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Save, Undo, Search, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { operacoes, representantes, tabelas, formasPagamento, clientes, produtos } from '@/mocks/data';
import { formatCurrency } from '@/utils/format';
import { ordersService } from '@/services/ordersService';
import { useStore } from '@/store/useStore';

type OrderItem = {
  produtoId: number;
  descricao: string;
  un: string;
  quant: number;
  descontoPerc: number;
  preco: number;
  total: number;
  obs?: string;
};

export const DigitacaoTab = () => {
  const { orders, setOrders } = useStore();
  const [formData, setFormData] = useState({
    operacao: '',
    clienteId: 0,
    clienteNome: '',
    representanteId: '',
    representanteNome: '',
    tabela: '',
    formaPagamento: '',
    prazo: '',
    boleto: '',
    rede: '',
  });
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<OrderItem>>({
    produtoId: 0,
    quant: 1,
    descontoPerc: 0,
  });
  const [observacoes, setObservacoes] = useState({
    cliente: '',
    pedido: '',
    nf: ''
  });

  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const filteredClients = clientes.filter(c => 
    c.nome.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.id.toString().includes(clientSearch)
  );

  const filteredProducts = produtos.filter(p => 
    p.descricao.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.id.toString().includes(productSearch)
  );

  const handleSelectClient = (client: typeof clientes[0]) => {
    setFormData({
      ...formData,
      clienteId: client.id,
      clienteNome: client.nome
    });
    setClientSearchOpen(false);
    setClientSearch('');
  };

  const handleSelectProduct = (product: typeof produtos[0]) => {
    setNewItem({
      ...newItem,
      produtoId: product.id,
      descricao: product.descricao,
      un: product.un,
      preco: product.preco
    });
    setProductSearchOpen(false);
    setProductSearch('');
  };

  const calculateItemTotal = (item: Partial<OrderItem>) => {
    if (!item.preco || !item.quant) return 0;
    const desconto = (item.descontoPerc || 0) / 100;
    return item.preco * item.quant * (1 - desconto);
  };

  const handleAddItem = () => {
    if (!newItem.produtoId || !newItem.quant) {
      toast.error('Preencha produto e quantidade');
      return;
    }
    
    const total = calculateItemTotal(newItem);
    setItems([...items, { ...newItem, total } as OrderItem]);
    setNewItem({ produtoId: 0, quant: 1, descontoPerc: 0 });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = items.reduce((acc, item) => {
    const bruto = (item.preco || 0) * (item.quant || 0);
    const desconto = bruto * ((item.descontoPerc || 0) / 100);
    return {
      bruto: acc.bruto + bruto,
      descontos: acc.descontos + desconto,
      liquido: acc.liquido + item.total
    };
  }, { bruto: 0, descontos: 0, liquido: 0 });

  const handleSave = async () => {
    if (!formData.operacao || !formData.clienteId || items.length === 0) {
      toast.error('Preencha operação, cliente e adicione pelo menos um item');
      return;
    }

    const order = {
      data: new Date().toISOString().split('T')[0],
      operacao: formData.operacao,
      clienteId: formData.clienteId,
      clienteNome: formData.clienteNome,
      representanteId: formData.representanteId,
      representanteNome: formData.representanteNome,
      situacao: 'Pendentes',
      especial: false,
      tabela: formData.tabela,
      formaPagamento: formData.formaPagamento,
      prazo: formData.prazo,
      boleto: false,
      rede: formData.rede,
      valor: totals.liquido,
      itens: items.map(item => ({
        produtoId: item.produtoId,
        descricao: item.descricao,
        av: 1,
        un: item.un,
        c: 1,
        quant: item.quant,
        descontoPerc: item.descontoPerc,
        preco: item.preco,
        liquido: item.total / item.quant,
        total: item.total,
        obs: item.obs
      })),
      totais: {
        bruto: totals.bruto,
        descontos: totals.descontos,
        descontosPerc: totals.bruto > 0 ? (totals.descontos / totals.bruto) * 100 : 0,
        icmsRepasse: 0,
        liquido: totals.liquido
      },
      observacoes
    };

    try {
      const newOrder = await ordersService.create(order as any);
      setOrders([...orders, newOrder]);
      toast.success(`Pedido ${newOrder.id} criado com sucesso!`);
      
      // Reset form
      setFormData({
        operacao: '',
        clienteId: 0,
        clienteNome: '',
        representanteId: '',
        representanteNome: '',
        tabela: '',
        formaPagamento: '',
        prazo: '',
        boleto: '',
        rede: '',
      });
      setItems([]);
      setObservacoes({ cliente: '', pedido: '', nf: '' });
    } catch (error) {
      toast.error('Erro ao criar pedido');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dados do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Operação *</label>
              <Select value={formData.operacao} onValueChange={(v) => setFormData({...formData, operacao: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {operacoes.map(op => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cliente *</label>
              <Dialog open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="h-4 w-4 mr-2" />
                    {formData.clienteNome || 'Buscar cliente (F3)'}
                  </Button>
                </DialogTrigger>
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
                    <div className="max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Cidade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredClients.map(client => (
                            <TableRow 
                              key={client.id}
                              className="cursor-pointer"
                              onClick={() => handleSelectClient(client)}
                            >
                              <TableCell>{client.id}</TableCell>
                              <TableCell>{client.nome}</TableCell>
                              <TableCell>{client.cidade}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Representante</label>
              <Select value={formData.representanteId} onValueChange={(v) => {
                const rep = representantes.find(r => r.id === v);
                setFormData({...formData, representanteId: v, representanteNome: rep?.nome || ''});
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {representantes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tabela</label>
              <Select value={formData.tabela} onValueChange={(v) => setFormData({...formData, tabela: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tabelas.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Forma Pagamento</label>
              <Select value={formData.formaPagamento} onValueChange={(v) => setFormData({...formData, formaPagamento: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(fp => (
                    <SelectItem key={fp} value={fp}>{fp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Prazo</label>
              <Input 
                placeholder="Ex: 30 dias"
                value={formData.prazo}
                onChange={(e) => setFormData({...formData, prazo: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Produto (F3)</label>
              <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="h-4 w-4 mr-2" />
                    {newItem.descricao || 'Buscar produto'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Buscar Produto</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input 
                      placeholder="Digite descrição ou ID..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>UN</TableHead>
                            <TableHead>Preço</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map(product => (
                            <TableRow 
                              key={product.id}
                              className="cursor-pointer"
                              onClick={() => handleSelectProduct(product)}
                            >
                              <TableCell>{product.id}</TableCell>
                              <TableCell>{product.descricao}</TableCell>
                              <TableCell>{product.un}</TableCell>
                              <TableCell>{formatCurrency(product.preco)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">UN</label>
              <Input value={newItem.un || ''} disabled />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Quant.</label>
              <Input 
                type="number"
                value={newItem.quant || ''}
                onChange={(e) => setNewItem({...newItem, quant: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">%Desc</label>
              <Input 
                type="number"
                value={newItem.descontoPerc || ''}
                onChange={(e) => setNewItem({...newItem, descontoPerc: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Button onClick={handleAddItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>UN</TableHead>
                <TableHead className="text-right">Quant.</TableHead>
                <TableHead className="text-right">%Desc</TableHead>
                <TableHead className="text-right">Pr.Unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.produtoId}</TableCell>
                  <TableCell>{item.descricao}</TableCell>
                  <TableCell>{item.un}</TableCell>
                  <TableCell className="text-right">{item.quant}</TableCell>
                  <TableCell className="text-right">{item.descontoPerc}%</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.preco)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Itens: {items.length}</span>
              <span>Preço tabela: {formatCurrency(totals.bruto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Descontos:</span>
              <span>{formatCurrency(totals.descontos)} ({totals.bruto > 0 ? ((totals.descontos / totals.bruto) * 100).toFixed(2) : 0}%)</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total Líquido:</span>
              <span>{formatCurrency(totals.liquido)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Observação Cliente</label>
            <Textarea 
              value={observacoes.cliente}
              onChange={(e) => setObservacoes({...observacoes, cliente: e.target.value})}
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Observação Pedido</label>
            <Textarea 
              value={observacoes.pedido}
              onChange={(e) => setObservacoes({...observacoes, pedido: e.target.value})}
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Observação NF</label>
            <Textarea 
              value={observacoes.nf}
              onChange={(e) => setObservacoes({...observacoes, nf: e.target.value})}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => toast.info('Desfazer não implementado')}>
          <Undo className="h-4 w-4 mr-2" />
          Desfazer
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Pedido
        </Button>
      </div>
    </div>
  );
};
