import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Save, Undo, Search, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { metadataService, type Operacao, type Tabela, type FormaPagamento, type PrazoPagto } from '@/services/metadataService';
import { clientsService, type Client } from '@/services/clientsService';
import { productsService, type Product } from '@/services/productsService';
import { representativesService, type Representative } from '@/services/representativesService';
import { formatCurrency } from '@/utils/format';
import { ordersService } from '@/services/ordersService';
import { useStore } from '@/store/useStore';

type OrderItem = {
  produtoId: number;
  descricao: string;
  un: string;
  tabelaId?: string | number;
  quant: number;
  descontoPerc: number;
  preco: number;
  total: number;
  obs?: string;
};

export const DigitacaoTab = () => {
  const { orders, setOrders, currentOrder, setCurrentOrder } = useStore();
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

  // Operações (metadata)
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [loadingOperacoes, setLoadingOperacoes] = useState(false);
  const [operacoesError, setOperacoesError] = useState<string | null>(null);

  // Tabelas (metadata)
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [loadingTabelas, setLoadingTabelas] = useState(false);
  const [tabelasError, setTabelasError] = useState<string | null>(null);
  const selectedTabela = tabelas.find((t) => String(t.id) === String(formData.tabela));
  const prazoMax = selectedTabela && typeof selectedTabela.prazoMedio === 'number' && selectedTabela.prazoMedio > 0
    ? selectedTabela.prazoMedio
    : undefined;

  // Formas de pagamento (metadata)
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loadingFormas, setLoadingFormas] = useState(false);
  const [formasError, setFormasError] = useState<string | null>(null);
  
  // Prazos de pagamento (metadata)
  const [prazos, setPrazos] = useState<PrazoPagto[]>([]);
  const [loadingPrazos, setLoadingPrazos] = useState(false);
  const [prazosError, setPrazosError] = useState<string | null>(null);

  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientPage, setClientPage] = useState(1);
  const [clientHasMore, setClientHasMore] = useState(true);
  // Guarda ID de forma de pagamento preferida do cliente selecionado para aplicar quando as formas carregarem
  const [preferredFormaId, setPreferredFormaId] = useState<string | number | null>(null);

  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [repSearchOpen, setRepSearchOpen] = useState(false);
  const [repSearch, setRepSearch] = useState('');
  const [loadingReps, setLoadingReps] = useState(false);
  const [repsError, setRepsError] = useState<string | null>(null);
  const [repPage, setRepPage] = useState(1);
  const [repHasMore, setRepHasMore] = useState(true);

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
        // dedupe by id
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
    // Carrega operações ao montar
    const loadOps = async () => {
      if (loadingOperacoes) return;
      setLoadingOperacoes(true);
      setOperacoesError(null);
      try {
        const ops = await metadataService.getOperacoes();
        setOperacoes(ops);
        // Preseleciona operação '001' se disponível e se ainda não houver seleção
        if (Array.isArray(ops) && ops.length > 0) {
          setFormData((prev) => {
            if (prev.operacao) return prev;
            const preferred =
              ops.find((op) => String(op.codigo || '').trim() === '001') ||
              ops.find((op) => String(op.id || '').trim() === '001') ||
              ops[0];
            return preferred ? { ...prev, operacao: preferred.descricao } : prev;
          });
        }
      } catch (e: any) {
        setOperacoesError(String(e));
      } finally {
        setLoadingOperacoes(false);
      }
    };
    loadOps();
  }, []);

  // Se veio um pedido para edição, busca detalhes via API e preenche o formulário e itens
  useEffect(() => {
    if (!currentOrder) return;
    const fill = async () => {
      try {
        const detail = await ordersService.getById(currentOrder.id);
        setFormData((prev) => ({
          ...prev,
          operacao: detail.operacao || prev.operacao,
          clienteId: detail.clienteId || 0,
          clienteNome: detail.clienteNome || '',
          representanteId: detail.representanteId || '',
          representanteNome: detail.representanteNome || '',
          tabela: '', // header de tabela fica vazio; seleção por item
          formaPagamento: detail.formaPagamento || '',
          prazo: detail.prazo || '',
          boleto: '',
          rede: detail.rede || '',
        }));
        const mapped = (detail.itens || []).map((it: any) => ({
          produtoId: it.produtoId,
          descricao: it.descricao,
          un: it.un,
          quant: it.quant,
          descontoPerc: it.descontoPerc,
          preco: it.preco,
          total: it.total,
          obs: it.obs,
          tabelaId: it.tabela_preco_id ?? it.tabelaId, // se o backend retornar
        })) as OrderItem[];
        setItems(mapped);
        setObservacoes({
          cliente: detail.observacaoCliente || '',
          pedido: detail.observacaoPedido || '',
          nf: detail.observacaoNF || '',
        });
      } catch {
        // Fallback: preenche com o que já temos
        setFormData((prev) => ({
          ...prev,
          operacao: currentOrder.operacao || prev.operacao,
          clienteId: currentOrder.clienteId || 0,
          clienteNome: currentOrder.clienteNome || '',
          representanteId: currentOrder.representanteId || '',
          representanteNome: currentOrder.representanteNome || '',
          tabela: '',
          formaPagamento: currentOrder.formaPagamento || '',
          prazo: currentOrder.prazo || '',
          boleto: '',
          rede: currentOrder.rede || '',
        }));
        const mapped = (currentOrder.itens || []).map((it: any) => ({
          produtoId: it.produtoId,
          descricao: it.descricao,
          un: it.un,
          quant: it.quant,
          descontoPerc: it.descontoPerc,
          preco: it.preco,
          total: it.total,
          obs: it.obs,
          tabelaId: (it as any)?.tabela_preco_id ?? (it as any)?.tabelaId,
        })) as OrderItem[];
        setItems(mapped);
        setObservacoes({
          cliente: currentOrder.observacaoCliente || '',
          pedido: currentOrder.observacaoPedido || '',
          nf: currentOrder.observacaoNF || '',
        });
      }
    };
    fill();
  }, [currentOrder]);

  // Carrega formas de pagamento ao montar
  useEffect(() => {
    const loadFormas = async () => {
      if (loadingFormas) return;
      setLoadingFormas(true);
      setFormasError(null);
      try {
        const fps = await metadataService.getFormasPagamento();
        setFormas(fps);
      } catch (e: any) {
        setFormasError(String(e));
      } finally {
        setLoadingFormas(false);
      }
    };
    loadFormas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega prazos ao montar
  useEffect(() => {
    const loadPrazos = async () => {
      if (loadingPrazos) return;
      setLoadingPrazos(true);
      setPrazosError(null);
      try {
        const ps = await metadataService.getPrazos();
        setPrazos(ps);
      } catch (e: any) {
        setPrazosError(String(e));
      } finally {
        setLoadingPrazos(false);
      }
    };
    loadPrazos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega tabelas ao montar
  useEffect(() => {
    // Carrega tabelas de preço quando um cliente é selecionado
    const loadTabelasCliente = async () => {
      if (!formData.clienteId) {
        setTabelas([]);
        setFormData((prev) => ({ ...prev, tabela: '' }));
        return;
      }
      if (loadingTabelas) return;
      setLoadingTabelas(true);
      setTabelasError(null);
      try {
        const tabs = await metadataService.getTabelasByCliente(formData.clienteId);
        setTabelas(tabs);
        const principal = tabs.find((t) => t.principal);
        setFormData((prev) => ({ ...prev, tabela: principal ? String(principal.id) : '' }));
      } catch (e: any) {
        setTabelasError(String(e));
        setTabelas([]);
        setFormData((prev) => ({ ...prev, tabela: '' }));
      } finally {
        setLoadingTabelas(false);
      }
    };
    loadTabelasCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.clienteId]);

  // Ao trocar a tabela, garante que prazo atual respeita o máximo
  useEffect(() => {
    if (typeof prazoMax !== 'number') return;
    const n = Math.floor(Number(formData.prazo) || 0);
    if (n > prazoMax) {
      setFormData((prev) => ({ ...prev, prazo: String(prazoMax) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tabela, prazoMax]);

  useEffect(() => {
    if (!clientSearchOpen) return;
    // initial load when opening dialog
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

  const filteredClients = clients; // server already filters by q

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [productHasMore, setProductHasMore] = useState(true);

  // Cache de tabelas por produto para dropdown por item
  const [itemTabelas, setItemTabelas] = useState<Record<number, Tabela[]>>({});
  const [itemTabelasLoading, setItemTabelasLoading] = useState<Record<number, boolean>>({});
  const [itemTabelasError, setItemTabelasError] = useState<Record<number, string | null>>({});

  const ensureItemTabelas = async (productId: number) => {
    if (itemTabelas[productId] || itemTabelasLoading[productId]) return;
    setItemTabelasLoading((prev) => ({ ...prev, [productId]: true }));
    setItemTabelasError((prev) => ({ ...prev, [productId]: null }));
    try {
      const tabs = await metadataService.getTabelasByProduto(productId);
      setItemTabelas((prev) => ({ ...prev, [productId]: tabs }));
      // Define padrão nos itens do mesmo produto se ainda não houver seleção
      setItems((prev) => prev.map((it) => {
        if (it.produtoId !== productId || it.tabelaId) return it;
        const prefer = tabs.find((t) => String(t.id) === String(formData.tabela));
        const chosen = prefer || tabs[0];
        return chosen ? { ...it, tabelaId: chosen.id } : it;
      }));
    } catch (e: any) {
      setItemTabelasError((prev) => ({ ...prev, [productId]: String(e) }));
    } finally {
      setItemTabelasLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const PRODUCT_LIMIT = 100;
  const loadProducts = async (reset = false) => {
    if (loadingProducts) return;
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const nextPage = reset ? 1 : productPage + 1;
      const data = await productsService.find(productSearch || undefined, nextPage, PRODUCT_LIMIT);
      setProducts((prev) => {
        const combined = reset ? data : [...prev, ...data];
        const seen = new Set<number>();
        return combined.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
      });
      setProductPage(nextPage);
      setProductHasMore(Array.isArray(data) && data.length === PRODUCT_LIMIT);
    } catch (e: any) {
      setProductsError(String(e));
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!productSearchOpen) return;
    loadProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSearchOpen]);

  useEffect(() => {
    if (!productSearchOpen) return;
    const t = setTimeout(() => {
      loadProducts(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSearch]);

  // Garante cache de tabelas por produto para todos itens atuais
  useEffect(() => {
    items.forEach((it) => {
      if (it?.produtoId) ensureItemTabelas(it.produtoId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const filteredRepresentatives = representatives; // server already filters by q

  const [preferredPrazoId, setPreferredPrazoId] = useState<string | number | null>(null);

  const handleSelectClient = (client: Client) => {
    setFormData({
      ...formData,
      clienteId: client.id,
      clienteNome: client.nome,
      tabela: '',
      formaPagamento: '',
      prazo: '',
    });
    // Marca forma preferida e tenta aplicar imediatamente se já temos a lista
    const pf = client.formaPagtoId ?? null;
    setPreferredFormaId(pf);
    if (pf != null && formas && formas.length > 0) {
      const match = formas.find((f) => String(f.id) === String(pf));
      if (match) {
        setFormData((prev) => ({ ...prev, formaPagamento: match.descricao }));
      }
    }
    // Marca prazo preferido e tenta aplicar imediatamente se já temos a lista
    const pp = client.prazoPagtoId ?? null;
    setPreferredPrazoId(pp);
    if (pp != null && prazos && prazos.length > 0) {
      const matchPrazo = prazos.find((p) => String(p.id) === String(pp));
      if (matchPrazo) {
        setFormData((prev) => ({ ...prev, prazo: matchPrazo.descricao }));
      }
    }
    setClientSearchOpen(false);
    setClientSearch('');
  };

  // Aplica forma de pagamento preferida quando a lista de formas estiver carregada
  useEffect(() => {
    if (preferredFormaId == null) return;
    if (!formas || formas.length === 0) return;
    const match = formas.find((f) => String(f.id) === String(preferredFormaId));
    if (match) {
      setFormData((prev) => ({ ...prev, formaPagamento: match.descricao }));
      setPreferredFormaId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formas]);

  // Aplica prazo preferido quando a lista de prazos estiver carregada
  useEffect(() => {
    if (preferredPrazoId == null) return;
    if (!prazos || prazos.length === 0) return;
    const match = prazos.find((p) => String(p.id) === String(preferredPrazoId));
    if (match) {
      setFormData((prev) => ({ ...prev, prazo: match.descricao }));
      setPreferredPrazoId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prazos]);

  const handleSelectProduct = (product: Product) => {
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
    if (!formData.operacao || !formData.clienteId || !formData.representanteId) {
      toast.error('Preencha operação, cliente e representante antes de adicionar itens');
      return;
    }
    if (!newItem.produtoId || !newItem.quant) {
      toast.error('Preencha produto e quantidade');
      return;
    }

    const produtoId = typeof newItem.produtoId === 'number' ? newItem.produtoId : Number(newItem.produtoId);
    const quant = Math.max(0, Number(newItem.quant) || 0);
    const descricao = newItem.descricao || '';
    const un = newItem.un || '';
    const descontoPerc = newItem.descontoPerc || 0;
    const preco = newItem.preco || 0;
    const obs = newItem.obs;
    const tabelaSelecionada = formData.tabela ? String(formData.tabela) : undefined;

    setItems((prev) => {
      if (!produtoId || !quant) return prev;

      const existingIndex = prev.findIndex((it) => {
        if (it.produtoId !== produtoId) return false;
        const itemTabela = it.tabelaId != null ? String(it.tabelaId) : undefined;
        return itemTabela === tabelaSelecionada;
      });

      if (existingIndex === -1) {
        const base: OrderItem = {
          produtoId,
          descricao,
          un,
          tabelaId: tabelaSelecionada,
          quant,
          descontoPerc,
          preco,
          total: 0,
          obs,
        };
        const total = calculateItemTotal(base);
        const withTotal = { ...base, total };
        return [...prev, withTotal];
      }

      const updated = [...prev];
      const current = updated[existingIndex];
      const merged: OrderItem = {
        ...current,
        quant: (current.quant || 0) + quant,
      };
      const total = calculateItemTotal(merged);
      updated[existingIndex] = { ...merged, total };
      return updated;
    });

    if (typeof newItem.produtoId === 'number' && newItem.produtoId > 0) {
      ensureItemTabelas(newItem.produtoId);
    }
    setNewItem({ produtoId: 0, quant: 1, descontoPerc: 0 });
  };

  const handleUpdateItem = (index: number, patch: Partial<OrderItem>) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], ...patch } as OrderItem;
      const total = calculateItemTotal(current);
      updated[index] = { ...current, total };
      return updated;
    });
  };

  const handleChangeItemTabela = async (index: number, tabelaId: string) => {
    const current = items[index];
    // Atualiza primeiro a tabela selecionada no item
    handleUpdateItem(index, { tabelaId });

    if (!current || !current.produtoId) return;
    const tabelaNum = Number(tabelaId);
    if (!tabelaNum) return;

    try {
      const novoPreco = await productsService.getPrecoByTabela(
        current.produtoId,
        tabelaNum,
      );
      handleUpdateItem(index, { preco: novoPreco });
    } catch (e: any) {
      toast.error(
        String(e) ||
          'Não foi possível atualizar o preço para a tabela selecionada',
      );
    }
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
    if (!formData.operacao || !formData.clienteId || !formData.representanteId || items.length === 0) {
      toast.error('Preencha operação, cliente, representante e adicione pelo menos um item');
      return;
    }
    // Valida prazo máximo conforme a tabela selecionada
    const prazoNum = Math.floor(Number(formData.prazo) || 0);
    if (typeof prazoMax === 'number' && prazoNum > prazoMax) {
      toast.error(`Prazo não pode exceder ${prazoMax} dias para a tabela selecionada`);
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
      itens: items.map((item, idx) => ({
        produtoId: item.produtoId,
        descricao: item.descricao,
        av: 1,
        un: item.un,
        c: 1,
        quant: item.quant,
        descontoPerc: item.descontoPerc,
        preco: item.preco,
        liquido: item.quant ? (item.total / item.quant) : 0,
        total: item.total,
        obs: item.obs,
        // campos auxiliares para o serviço montar o payload do backend
        tabela_preco_id: item.tabelaId ?? (formData.tabela ? Number(formData.tabela) : undefined),
        ordem: idx + 1,
        valor_bruto_calc: (item.preco || 0) * (item.quant || 0),
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
      let saved;
      if (currentOrder && currentOrder.id) {
        // Atualiza (mock possui update; backend pode não ter ainda)
        saved = await ordersService.update(currentOrder.id, order as any);
        // Atualiza array local
        setOrders(orders.map(o => (o.id === currentOrder.id ? { ...(o as any), ...saved } : o)) as any);
        toast.success(`Pedido ${currentOrder.id} atualizado com sucesso!`);
      } else {
        saved = await ordersService.create(order as any);
        setOrders([...orders, saved]);
        toast.success(`Pedido ${saved.id} criado com sucesso!`);
      }
      
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
      setCurrentOrder(null);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Operação *</label>
              <Select
                value={formData.operacao}
                onValueChange={(v) => setFormData({ ...formData, operacao: v })}
                disabled={loadingOperacoes || !!operacoesError}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingOperacoes ? 'Carregando...' : operacoesError ? 'Erro ao carregar' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {operacoes.filter((op) => String(op.descricao || '').trim().length > 0).map((op) => (
                    <SelectItem key={`${op.id}-${op.codigo}`} value={op.descricao}>
                      {op.codigo ? `${op.codigo} - ${op.descricao}` : op.descricao}
                    </SelectItem>
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
                            {filteredClients.map((client) => (
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
                            {filteredClients.length === 0 && (
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

            <div>
              <label className="text-sm font-medium mb-2 block">Representante *</label>
              <Dialog open={repSearchOpen} onOpenChange={setRepSearchOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="h-4 w-4 mr-2" />
                    {formData.representanteNome || 'Buscar representante'}
                  </Button>
                </DialogTrigger>
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
                            {filteredRepresentatives.map((r) => (
                              <TableRow
                                key={r.id}
                                className="cursor-pointer"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    representanteId: r.id,
                                    representanteNome: r.nome,
                                  });
                                  setRepSearchOpen(false);
                                  setRepSearch('');
                                }}
                              >
                                <TableCell>{r.id}</TableCell>
                                <TableCell>{r.nome}</TableCell>
                              </TableRow>
                            ))}
                            {filteredRepresentatives.length === 0 && (
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

            <div>
              <label className="text-sm font-medium mb-2 block">Tabela</label>
              <Select
                value={formData.tabela}
                onValueChange={(v) => setFormData({ ...formData, tabela: v })}
                disabled={loadingTabelas || !!tabelasError || !formData.clienteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.clienteId ? 'Selecione um cliente' : (loadingTabelas ? 'Carregando...' : tabelasError ? 'Erro ao carregar' : 'Selecione')} />
                </SelectTrigger>
                <SelectContent>
                  {tabelas
                    .filter((t) => String(t.descricao || '').trim().length > 0)
                    .map((t) => (
                      <SelectItem key={`${t.id}-${t.descricao}`} value={String(t.id)}>
                        {t.descricao}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Forma Pagamento</label>
              <Select
                value={formData.formaPagamento}
                onValueChange={(v) => setFormData({ ...formData, formaPagamento: v })}
                disabled={loadingFormas || !!formasError}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingFormas ? 'Carregando...' : formasError ? 'Erro ao carregar' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {formas
                    .filter((f) => !f.inativo && String(f.descricao || '').trim().length > 0)
                    .map((f) => (
                      <SelectItem key={`${f.id}-${f.codigo || f.descricao}`} value={String(f.descricao)}>
                        {f.descricao}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Prazo</label>
              <Select
                value={formData.prazo}
                onValueChange={(v) => setFormData({ ...formData, prazo: v })}
                disabled={loadingPrazos || !!prazosError}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingPrazos ? 'Carregando...' : prazosError ? 'Erro ao carregar' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {prazos?.slice()
                    .sort((a, b) =>
                      String(a.descricao || '').localeCompare(
                        String(b.descricao || ''),
                        'pt-BR',
                        { numeric: true, sensitivity: 'base' } as any,
                      ),
                    )
                    .map((p) => (
                      <SelectItem key={`${p.id}-${p.codigo || p.descricao}`} value={String(p.descricao)}>
                        {p.descricao}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {typeof prazoMax === 'number' && (
                <p className="text-xs text-muted-foreground mt-1">Prazo máximo permitido pela tabela: {prazoMax} dias</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
            <div className="sm:col-span-2 lg:col-span-2">
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
                    <div className="max-h-96 overflow-auto" onScroll={(e) => {
                      const el = e.currentTarget;
                      if (productHasMore && !loadingProducts && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                        loadProducts(false);
                      }
                    }}>
                      {loadingProducts && products.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">Carregando produtos...</div>
                      ) : productsError ? (
                        <div className="py-6 text-center text-sm text-red-600">{productsError}</div>
                      ) : (
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
                            {products.map((product) => (
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
                            {products.length === 0 && !loadingProducts && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                                  Nenhum produto encontrado
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
              <Button
                onClick={handleAddItem}
                className="w-full"
                disabled={!formData.operacao || !formData.clienteId || !formData.representanteId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tabela</TableHead>
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
                  <TableCell>
                    {(() => {
                      const tabs = itemTabelas[item.produtoId] || [];
                      const loading = !!itemTabelasLoading[item.produtoId];
                      const error = itemTabelasError[item.produtoId];
                      return (
                        <Select
                          value={item.tabelaId != null ? String(item.tabelaId) : ''}
                          onValueChange={(v) => handleChangeItemTabela(idx, v)}
                          disabled={loading || !!error}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={loading ? '...' : error ? 'Erro' : 'Sel.'} />
                          </SelectTrigger>
                          <SelectContent>
                            {tabs
                              .filter((t) => String(t.descricao || '').trim().length > 0)
                              .map((t) => (
                                <SelectItem key={`${t.id}-${t.descricao}`} value={String(t.id)}>
                                  {t.descricao}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="h-8 w-24 ml-auto text-right"
                      value={item.quant}
                      onChange={(e) => handleUpdateItem(idx, { quant: parseFloat(e.target.value) || 0 })}
                      min={0}
                      step="any"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="h-8 w-20 text-right"
                        value={item.descontoPerc}
                        onChange={(e) => handleUpdateItem(idx, { descontoPerc: parseFloat(e.target.value) || 0 })}
                        min={0}
                        max={100}
                        step="any"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </TableCell>
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
          </div>

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

      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button variant="outline" onClick={() => toast.info('Desfazer não implementado')} size="sm" className="w-full sm:w-auto">
          <Undo className="h-4 w-4 sm:mr-2" />
          <span>Desfazer</span>
        </Button>
        <Button onClick={handleSave} size="sm" className="w-full sm:w-auto" disabled={!!(currentOrder && currentOrder.transmitido)}>
          <Save className="h-4 w-4 sm:mr-2" />
          <span>Salvar Pedido</span>
        </Button>
      </div>
    </div>
  );
};
