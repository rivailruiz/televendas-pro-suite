import { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Search, X, FileEdit, Trash2, Mail, Download, Printer, File, Eye, Loader2, Copy, Send } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ordersService, type Order, type OrderParcela } from '@/services/ordersService';
import { clientsService, type Client } from '@/services/clientsService';
import { authService, getEmpresaDisplayName } from '@/services/authService';
import { useStore } from '@/store/useStore';
import { situacoes } from '@/mocks/data';
import { metadataService, type Operacao } from '@/services/metadataService';
import { representativesService, type Representative } from '@/services/representativesService';
import { formatCurrency, formatDate } from '@/utils/format';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

interface PesquisaTabProps {
  onNavigateToDigitacao?: () => void;
}

function escapeCssContent(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export const PesquisaTab = ({ onNavigateToDigitacao }: PesquisaTabProps) => {
  const { canInsert } = useModuleCrudPermission('PEDIDOS');
  const empresaAtual = authService.getEmpresa();
  const nomeEmpresa = empresaAtual ? getEmpresaDisplayName(empresaAtual) : '';
  const getTodayStr = () => new Date().toLocaleDateString('sv-SE');
  const today = getTodayStr();
  const ORDER_LIMIT = 100;
  const { orders, selectedOrders, setOrders, toggleOrderSelection, clearSelection, setCurrentOrder, setOrderToDuplicate } = useStore();
  
  // Recupera filtros de data salvos ou usa data de hoje
  const getSavedDateFilters = () => {
    try {
      const saved = localStorage.getItem('pesquisa-date-filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          dataInicio: parsed.dataInicio || today,
          dataFim: parsed.dataFim || today,
        };
      }
    } catch (e) {
      console.warn('Erro ao recuperar filtros de data:', e);
    }
    return { dataInicio: today, dataFim: today };
  };

  const savedDates = getSavedDateFilters();
  const [filters, setFilters] = useState({
    dataInicio: savedDates.dataInicio,
    dataFim: savedDates.dataFim,
    situacao: '__ALL__',
    especial: false,
    operacoes: '',
    pedidoIds: '',
    representante: '',
    cliente: '',
  });
  // Operações (metadata)
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [loadingOperacoes, setLoadingOperacoes] = useState(false);
  const [operacoesError, setOperacoesError] = useState<string | null>(null);

  const [outputMode, setOutputMode] = useState<'video' | 'impressora'>('video');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewParcelas, setPreviewParcelas] = useState<OrderParcela[]>([]);
  const previewRequestId = useRef(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [emailOrder, setEmailOrder] = useState<Order | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [clienteNome, setClienteNome] = useState<string>('');
  const [representanteNome, setRepresentanteNome] = useState<string>('');

  const isAdmin = authService.isAdmin();
  const sessionRepresentante = useMemo(() => {
    const session = authService.getSession();
    const p = session?.payload;
    const isForcaDeVendas = p?.user?.forca_de_vendas === true || Boolean(p?.user?.usuario_empresa_id);
    if (!isForcaDeVendas || isAdmin) return null;
    const codigoRep = p?.user?.codigo_representante ?? null;
    const nome = p?.user?.nome_representante ?? p?.user?.nome ?? session?.nome ?? '';
    if (!codigoRep && !p?.user?.usuario_empresa_id) return null;
    return { codigo: String(codigoRep ?? ''), nome: String(nome) };
  }, [isAdmin]);

  useEffect(() => {
    if (!sessionRepresentante) return;
    setFilters((prev) => ({ ...prev, representante: sessionRepresentante.codigo }));
    setRepresentanteNome(sessionRepresentante.nome);
  }, [sessionRepresentante]);

  const normalizeOperacaoCodigo = (codigo?: string | number | null) => {
    const str = String(codigo ?? '').trim();
    if (!str) return '';
    if (/^\d+$/.test(str)) return String(Number(str));
    return str;
  };

  const formatOperacao = (order: Order) => {
    if (order.operacaoDescricao) return order.operacaoDescricao;

    const normalizedOrderCode = normalizeOperacaoCodigo(order.operacaoCodigo || order.operacao);
    const orderOperacaoId = order.operacaoId ? String(order.operacaoId) : '';

    const match = operacoes.find((op) => {
      const opCode = normalizeOperacaoCodigo(op.codigo);
      const sameCode = opCode && normalizedOrderCode && opCode === normalizedOrderCode;
      const sameId = orderOperacaoId && String(op.id) === orderOperacaoId;
      return sameCode || sameId;
    });

    if (match?.descricao) return match.descricao;

    return order.operacao || order.operacaoCodigo || '';
  };

  const formatClienteCodigo = (order?: Order | null) => {
    if (!order) return '';
    const val = order.clienteCodigo;
    return val !== undefined && val !== null ? String(val) : '';
  };

  const formatRepresentanteCodigo = (order?: Order | null) => {
    if (!order) return '';
    const val = order.representanteCodigo;
    return val !== undefined && val !== null ? String(val) : '';
  };

  const previewClienteCodigo = formatClienteCodigo(previewOrder);
  const previewRepresentanteCodigo = formatRepresentanteCodigo(previewOrder);

  const formatCep = (cep?: string | null) => {
    if (!cep) return '';
    const digits = String(cep).replace(/\D/g, '');
    if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return String(cep).trim();
  };

  const formatEnderecoCliente = (order?: Order | null) => {
    if (!order) return '';
    const endereco = String(order.clienteEndereco ?? '').trim();
    const numero = String(order.clienteNumero ?? '').trim();
    const complemento = String(order.clienteComplemento ?? '').trim();
    const bairro = String(order.clienteBairro ?? '').trim();
    const cidade = String(order.clienteCidade ?? '').trim();
    const uf = String(order.clienteUf ?? '').trim();
    const cep = formatCep(order.clienteCep);

    const linha1 = [endereco, numero].filter(Boolean).join(', ');
    const linha2 = [complemento, bairro].filter(Boolean).join(' - ');
    const linha3 = [cidade, uf].filter(Boolean).join('/');
    const partes = [linha1, linha2, linha3, cep ? `CEP ${cep}` : ''].filter(Boolean);
    return partes.join(' | ');
  };

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
  const [clientSearchField, setClientSearchField] = useState<'nome' | 'fantasia' | 'cnpjCpf' | 'codigoCliente' | 'telefone' | 'bairro'>('nome');
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientPage, setClientPage] = useState(1);
  const [clientHasMore, setClientHasMore] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersHasMore, setOrdersHasMore] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [filteredSummary, setFilteredSummary] = useState<{ total: number; somaValor: number } | null>(null);

  useEffect(() => {
    loadOrders(true);
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

  const loadOrders = async (reset = false) => {
    // Evita chamada quando empresa não está selecionada (ex.: navegação/redirect em andamento)
    const empresa = authService.getEmpresa();
    if (!empresa) return;
    if (ordersLoading) return;
    if (reset) {
      setOrders([]);
      setOrdersPage(1);
      setOrdersHasMore(true);
      // Total de pedidos filtrados e soma dos valores, independente do que
      // já foi carregado na tela por scroll (reunião 04/08/2026).
      ordersService
        .getFilteredSummary(filters)
        .then((summary) => setFilteredSummary(summary))
        .catch(() => setFilteredSummary(null));
    }
    setOrdersLoading(true);
    try {
      const nextPage = reset ? 1 : ordersPage + 1;
      const data = await ordersService.list(filters, nextPage, ORDER_LIMIT);
      const existing = reset ? [] : orders;
      const combined = [...existing, ...data];
      const seen = new Set<number>();
      const deduped = combined.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
      setOrders(deduped);
      setOrdersPage(nextPage);
      const received = Array.isArray(data) ? data.length : 0;
      const appended = deduped.length - existing.length;
      const nextHasMore = received === ORDER_LIMIT && appended > 0;
      setOrdersHasMore(nextHasMore);
    } catch (e: any) {
      // Silencia rejeições esperadas na transição e registra no console
      console.warn('Falha ao carregar pedidos:', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handlePesquisar = () => {
    loadOrders(true);
  };

  const handleNovoPedido = () => {
    if (!canInsert) return;
    setCurrentOrder(null);
    if (onNavigateToDigitacao) onNavigateToDigitacao();
  };

  const isOrdersInitialLoading = ordersLoading && orders.length === 0;
  const isOrdersLoadingMore = ordersLoading && orders.length > 0;

  const handleOrdersScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!ordersHasMore || ordersLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadOrders(false);
    }
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
      const filters: Record<string, any> = {};
      const q = clientSearch.trim();
      if (q) {
        if (clientSearchField === 'nome') filters.nome = q;
        else if (clientSearchField === 'fantasia') filters.fantasia = q;
        else if (clientSearchField === 'cnpjCpf') filters.query = q;
        else if (clientSearchField === 'codigoCliente') filters.codigoCliente = q;
        else if (clientSearchField === 'telefone') filters.fone = q;
        else if (clientSearchField === 'bairro') filters.bairro = q;
      }
      const data = await clientsService.find(filters, nextPage, CLIENT_LIMIT);
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

  useEffect(() => {
    if (!clientSearchOpen) return;
    loadClients(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearchField]);

  const handleLimparFiltros = () => {
    const newToday = getTodayStr();
    setFilters({
      dataInicio: newToday,
      dataFim: newToday,
      situacao: '__ALL__',
      especial: false,
      operacoes: '',
      pedidoIds: '',
      representante: '',
      cliente: '',
    });
    setClienteNome('');
    setRepresentanteNome('');
    clearSelection();
    // Limpa os filtros de data do localStorage
    localStorage.removeItem('pesquisa-date-filters');
  };

  const situacaoLabel = (situacao?: string) => {
    if (situacao === 'Faturados') return 'Faturado';
    if (situacao === 'Cancelados') return 'Cancelado';
    if (situacao === 'Em processamento') return 'Em processamento';
    return 'Pendente';
  };

  const situacaoBadgeClasses = (situacao?: string) => {
    if (situacao === 'Faturados') return 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
    if (situacao === 'Cancelados') return 'border-transparent bg-destructive/15 text-destructive';
    if (situacao === 'Em processamento') return 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    return 'border-transparent bg-success/15 text-success';
  };

  const attemptAlterar = (order: Order) => {
    if (order.situacao === 'Faturados') {
      toast.error('Pedido já faturado não pode ser editado. Volte o status para pendente antes de editar.');
      return;
    }
    if (order.situacao === 'Cancelados') {
      toast.error('Pedido cancelado não pode ser editado. Volte o status para pendente antes de editar.');
      return;
    }
    if (order.situacao === 'Em processamento') {
      toast.error('Pedido em processamento no ADS não pode ser editado.');
      return;
    }
    setCurrentOrder(order);
    if (onNavigateToDigitacao) onNavigateToDigitacao();
  };

  const attemptExcluir = (order: Order) => {
    if (order.situacao === 'Faturados') {
      toast.error('Pedido já faturado não pode ser excluído. Volte o status para pendente antes de excluir.');
      return;
    }
    if (order.situacao === 'Em processamento') {
      toast.error('Pedido em processamento no ADS não pode ser excluído.');
      return;
    }
    setOrderToDelete(order);
    setDeleteConfirmOpen(true);
  };

  const openEmailDialog = (order: Order) => {
    setEmailOrder(order);
    setEmailTo('');
    setEmailCc('');
  };

  const handleSendEmail = async () => {
    if (!emailOrder) return;
    const to = emailTo.trim();
    if (!to) {
      toast.error('Informe o e-mail do destinatário');
      return;
    }
    const cc = emailCc
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    setSendingEmail(true);
    try {
      await ordersService.sendEmail(emailOrder.id, { to, cc: cc.length ? cc : undefined });
      toast.success(`Pedido ${emailOrder.id} enviado por e-mail para ${to}`);
      setEmailOrder(null);
    } catch (error: any) {
      toast.error(error?.message || String(error) || 'Erro ao enviar e-mail');
    } finally {
      setSendingEmail(false);
    }
  };

  const [changingStatus, setChangingStatus] = useState(false);

  const handleChangeStatusSelected = async (situacao: string) => {
    if (selectedOrders.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }
    setChangingStatus(true);
    try {
      if (selectedOrders.length === 1) {
        await ordersService.updateStatus(selectedOrders[0], situacao);
      } else {
        await ordersService.updateStatusBulk(selectedOrders, situacao);
      }
      toast.success(`Status atualizado para "${situacaoLabel(situacao)}".`);
      loadOrders(true);
    } catch (error: any) {
      toast.error(error?.message || String(error) || 'Erro ao atualizar status');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleExcluir = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }
    if (selectedOrders.length > 1) {
      toast.error('Selecione apenas um pedido para excluir');
      return;
    }

    const order = getSingleSelectedOrder();
    if (!order) {
      toast.error('Selecione exatamente um pedido para excluir');
      return;
    }
    attemptExcluir(order);
  };

  const [enviandoAdsId, setEnviandoAdsId] = useState<number | null>(null);

  const attemptEnviarAds = async (order: Order) => {
    if (order.situacao !== 'Pendentes') {
      toast.error('Somente pedidos pendentes podem ser enviados para o ADS.');
      return;
    }
    setEnviandoAdsId(order.id);
    try {
      const updated = await ordersService.enviarAds(order.id);
      toast.success(
        updated.numeroPedidoErp
          ? `Pedido enviado para o ADS. Nº no ERP: ${updated.numeroPedidoErp}`
          : 'Pedido enviado para o ADS.',
      );
      loadOrders(true);
    } catch (error: any) {
      toast.error(error?.message || String(error) || 'Erro ao enviar pedido para o ADS');
    } finally {
      setEnviandoAdsId(null);
    }
  };

  // Exporta o pedido para Excel com as mesmas colunas exibidas na modal
  // "Ver pedido" (produto, descrição, UN, cód. tabela, cód. fábrica, quant.,
  // %desc, preço, total) — pedido de Marcelo, reunião 03/08/2026.
  const exportOrderToExcel = async (order: Order) => {
    const detail = await ordersService.getById(order.id).catch(() => order);
    const itens = Array.isArray(detail.itens) ? detail.itens : [];
    const header = ['Produto', 'Descrição', 'UN', 'Cód. Tabela', 'Cód. Fábrica', 'Quant.', '%Desc', 'Preço', 'Total'];
    const dataRows = itens.map((it) => [
      it.codigoProduto ?? '',
      it.descricao ?? '',
      it.un ?? '',
      it.codigoTabelaPreco ?? '',
      it.codigoFabrica ?? '',
      Number(it.quant ?? 0),
      Number(it.descontoPerc ?? 0),
      Number(it.preco ?? 0),
      Number(it.total ?? 0),
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    ws['!cols'] = [
      { wch: 12 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 14 },
      { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, `Pedido ${order.id}`.slice(0, 31));
    XLSX.writeFile(wb, `pedido_${order.id}.xlsx`);
  };

  const handleExportar = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }

    try {
      const toExport = orders.filter((o) => selectedOrders.includes(o.id));
      for (const order of toExport) {
        await exportOrderToExcel(order);
      }
      toast.success('Pedidos exportados para Excel');
    } catch (error) {
      toast.error('Erro ao exportar pedidos');
    }
  };

  const handleAlterar = () => {
    const order = getSingleSelectedOrder();
    if (!order) {
      toast.error('Selecione exatamente um pedido para alterar');
      return;
    }
    attemptAlterar(order);
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
    openPreview(order);
  };

  const openPreview = (order: Order) => {
    setPreviewOrder(order);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewParcelas([]);
    const requestId = ++previewRequestId.current;
    ordersService
      .getById(order.id)
      .then((detail) => {
        if (previewRequestId.current !== requestId) return;
        setPreviewOrder(detail);
      })
      .catch((error: any) => {
        if (previewRequestId.current !== requestId) return;
        setPreviewError(error?.message || 'Erro ao carregar detalhes do pedido');
      })
      .finally(() => {
        if (previewRequestId.current !== requestId) return;
        setPreviewLoading(false);
      });
    // Parcelas do prazo negociado (vencimento e valor) — reunião 04/08/2026.
    // Pedido sem prazo negociado simplesmente não tem parcelas cadastradas.
    ordersService
      .getParcelas(order.id)
      .then((parcelas) => {
        if (previewRequestId.current !== requestId) return;
        setPreviewParcelas(parcelas);
      })
      .catch(() => {
        if (previewRequestId.current !== requestId) return;
        setPreviewParcelas([]);
      });
  };

  const handleConfirmExcluir = async () => {
    if (!orderToDelete) {
      setDeleteConfirmOpen(false);
      return;
    }
    setDeletingOrder(true);
    try {
      await ordersService.remove(orderToDelete.id);
      toast.success('Pedido excluído');
      clearSelection();
      setPreviewOrder((prev) => {
        if (prev?.id === orderToDelete.id) {
          setPreviewOpen(false);
          return null;
        }
        return prev;
      });
      loadOrders(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir pedido');
    } finally {
      setDeletingOrder(false);
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
    }
  };

  const buildPrintableHtml = (order: Order, parcelas: OrderParcela[] = []) => {
    const items = Array.isArray(order.itens) ? order.itens : [];
    const session = authService.getSession();
    const nomeUsuario = session?.nome ?? session?.usuario ?? '';
    const agora = new Date().toLocaleString('pt-BR');
    const opLabel = formatOperacao(order);
    const codigoCliente = formatClienteCodigo(order);
    const clienteCodigoLabel = codigoCliente ? ` (Cód.: ${codigoCliente})` : '';
    const repCodigo = formatRepresentanteCodigo(order);
    const representanteLabel = repCodigo
      ? `${repCodigo} - ${order.representanteNome ?? ''}`
      : (order.representanteNome ?? '');
    const formatCodigoProduto = (it: any) =>
      it?.codigoProduto ?? it?.codigo_produto ?? it?.produto_codigo ?? '';
    const formatCodigoTabela = (it: any) =>
      it?.codigoTabelaPreco ?? it?.codigo_tabela_preco ?? '';
    const formatCodigoFabrica = (it: any) =>
      it?.codigoFabrica ?? it?.codigo_fabrica ?? '';
    const rows = items
      .map(
        (it) => `
          <tr>
            <td>${formatCodigoProduto(it)}</td>
            <td>${String(it.descricao ?? '')}</td>
            <td>${String(it.un ?? '')}</td>
            <td>${formatCodigoTabela(it)}</td>
            <td>${formatCodigoFabrica(it)}</td>
            <td style="text-align:right;">${Number(it.quant ?? 0)}</td>
            <td style="text-align:right;">${(Number(it.descontoPerc ?? 0)).toFixed(2)}%</td>
            <td style="text-align:right;">${formatCurrency(it.preco ?? 0)}</td>
            <td style="text-align:right; font-weight:600;">${formatCurrency(it.total ?? 0)}</td>
          </tr>`
      )
      .join('');

    const parcelasRows = parcelas
      .map(
        (p) => `
          <tr>
            <td>${p.parcela}</td>
            <td>${formatDate(p.vencto)}</td>
            <td style="text-align:right;">${formatCurrency(p.valor)}</td>
          </tr>`
      )
      .join('');
    const parcelasSection = parcelas.length
      ? `
        <div style="margin-top:16px;">
          <div style="font-weight:600; margin-bottom:4px;">Parcelas (prazo negociado)</div>
          <table style="width:auto; min-width:260px;">
            <thead>
              <tr><th>Parc.</th><th>Vencimento</th><th style="text-align:right;">Valor</th></tr>
            </thead>
            <tbody>${parcelasRows}</tbody>
          </table>
        </div>`
      : '';

    return `<!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pedido ${order.id}</title>
        <style>
          @page { margin: 12mm 12mm 16mm 12mm; }
          @page { @bottom-left { content: "Impresso por: ${escapeCssContent(nomeUsuario)} — ${escapeCssContent(agora)}"; font-size: 7.5pt; color: #6B7280; } }
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
        <div style="font-size:13px;font-weight:bold;margin-bottom:6px">${nomeEmpresa}</div>
        <h1>Pedido #${order.id}</h1>
        <div class="meta">
          <div>Data: ${formatDate(order.data)}</div>
          <div>Cliente: ${order.clienteNome ?? ''}${clienteCodigoLabel}</div>
          <div>Operação: ${opLabel ?? ''}</div>
          <div>Força de Vendas: ${representanteLabel}</div>
          <div>Endereço: ${formatEnderecoCliente(order) || '-'}</div>
          <div>Forma de pagamento: ${order.formaPagamento || '-'}</div>
          <div>Prazo: ${order.prazo || '-'}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Descrição</th>
              <th>UN</th>
              <th>Cód. Tabela</th>
              <th>Cód. Fábrica</th>
              <th style="text-align:right;">Quant.</th>
              <th style="text-align:right;">%Desc</th>
              <th style="text-align:right;">Preço</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="9" style="text-align:center; color:#6B7280;">Sem itens</td></tr>'}
          </tbody>
        </table>
        ${parcelasSection}
        <div class="totais">
          <div><span>Total Bruto:</span><span>${formatCurrency(order.totais?.bruto ?? order.valor ?? 0)}</span></div>
          <div><span>Descontos:</span><span>${formatCurrency(order.totais?.descontos ?? 0)} (${(order.totais?.descontosPerc ?? 0).toFixed?.(2) ?? 0}%)</span></div>
          <div class="bold"><span>Total do Pedido:</span><span>${formatCurrency(order.totais?.liquido ?? order.valor ?? 0)}</span></div>
        </div>
      </body>
      </html>`;
  };

  const printOrder = async (order: Order) => {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Não foi possível abrir a janela de impressão');
      return;
    }
    const parcelas = await ordersService.getParcelas(order.id).catch(() => [] as OrderParcela[]);
    const html = buildPrintableHtml(order, parcelas);
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    // Pequeno delay para garantir render antes de imprimir
    setTimeout(() => {
      try { win.print(); } catch {}
    }, 100);
  };

  const handleImpressora = () => {
    const order = getSingleSelectedOrder();
    if (!order) {
      toast.error('Selecione exatamente um pedido para imprimir');
      return;
    }
    printOrder(order);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg border">
        <div className="space-y-2">
          <Label className="text-xs">Período</Label>
          <div className="flex gap-1 items-center">
            <Input
              type="date"
              className="text-xs min-w-0 flex-1"
              value={filters.dataInicio}
              onChange={(e) => {
                const newFilters = { ...filters, dataInicio: e.target.value };
                setFilters(newFilters);
                // Salva filtros de data no localStorage
                localStorage.setItem('pesquisa-date-filters', JSON.stringify({
                  dataInicio: newFilters.dataInicio,
                  dataFim: newFilters.dataFim,
                }));
              }}
            />
            <span className="text-xs text-muted-foreground shrink-0">a</span>
            <Input
              type="date"
              className="text-xs min-w-0 flex-1"
              value={filters.dataFim}
              onChange={(e) => {
                const newFilters = { ...filters, dataFim: e.target.value };
                setFilters(newFilters);
                // Salva filtros de data no localStorage
                localStorage.setItem('pesquisa-date-filters', JSON.stringify({
                  dataInicio: newFilters.dataInicio,
                  dataFim: newFilters.dataFim,
                }));
              }}
            />
          </div>
        </div>

        {/* Campo Usuário removido: não suportado pela API de pedidos */}

        <div className="space-y-2">
          <Label className="text-xs">Situação</Label>
          <Select value={filters.situacao} onValueChange={(v) => setFilters({ ...filters, situacao: v })}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="__ALL__">Todos</SelectItem>
              {situacoes.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end space-x-2 pb-2">
          <Checkbox
            id="especial"
            checked={filters.especial}
            onCheckedChange={(checked) => setFilters({ ...filters, especial: !!checked })}
          />
          <Label htmlFor="especial" className="text-xs">Especial</Label>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Operações</Label>
          <Select
            value={filters.operacoes}
            onValueChange={(v) => setFilters({ ...filters, operacoes: v === '__ALL__' ? '' : v })}
            disabled={loadingOperacoes || !!operacoesError}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder={loadingOperacoes ? 'Carregando...' : operacoesError ? 'Erro ao carregar' : 'Todas'} />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
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
          <Label className="text-xs">Pedido(s)</Label>
          <Input
            className="text-xs"
            placeholder="IDs separados por vírgula"
            value={filters.pedidoIds}
            onChange={(e) => setFilters({ ...filters, pedidoIds: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Força de Vendas</Label>
          <Button
            variant="outline"
            className="w-full justify-start text-xs truncate"
            onClick={() => { if (!sessionRepresentante) setRepSearchOpen(true); }}
            disabled={!!sessionRepresentante}
          >
            <Search className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">{representanteNome || (filters.representante ? `Cód. ${filters.representante}` : 'Buscar força de vendas')}</span>
          </Button>
          <Dialog open={repSearchOpen} onOpenChange={setRepSearchOpen}>
            <DialogContent className="w-[95vw] max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buscar Força de Vendas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Digite nome ou código..."
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
                    <div className="py-6 text-center text-sm text-muted-foreground">Carregando força de vendas...</div>
                  ) : repsError ? (
                    <div className="py-6 text-center text-sm text-red-600">{repsError}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {representatives.map((r) => (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer"
                          onClick={() => {
                            const codigo = r.codigoRepresentante ?? r.id;
                            setFilters({ ...filters, representante: String(codigo) });
                            setRepresentanteNome(r.nome);
                            setRepSearchOpen(false);
                            setRepSearch('');
                          }}
                        >
                          <TableCell>{r.codigoRepresentante ?? ''}</TableCell>
                          <TableCell>{r.nome}</TableCell>
                        </TableRow>
                      ))}
                        {representatives.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                              Nenhuma força de vendas encontrada
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
          <Label className="text-xs">Código do cliente</Label>
          <Button variant="outline" className="w-full justify-start text-xs truncate" onClick={() => setClientSearchOpen(true)}>
            <Search className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">{clienteNome || (filters.cliente ? `Cód. ${filters.cliente}` : 'Buscar cliente')}</span>
          </Button>
          <Dialog open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
            <DialogContent className="w-[95vw] max-w-4xl">
              <DialogHeader>
                <DialogTitle>Buscar Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Select
                    value={clientSearchField}
                    onValueChange={(v) => setClientSearchField(v as typeof clientSearchField)}
                  >
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nome">Nome</SelectItem>
                      <SelectItem value="fantasia">Fantasia</SelectItem>
                      <SelectItem value="cnpjCpf">CNPJ/CPF</SelectItem>
                      <SelectItem value="codigoCliente">Código</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="bairro">Bairro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Digite para buscar..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    autoFocus
                    className="flex-1"
                  />
                </div>
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
                          <TableHead>Código</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Endereço</TableHead>
                          <TableHead>Bairro</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead>Telefone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients.map((client) => {
                          const enderecoCompleto = [client.endereco, client.numero]
                            .filter(Boolean)
                            .join(', ');
                          return (
                            <TableRow
                              key={client.id}
                              className="cursor-pointer"
                              onClick={() => {
                                const codigo = client.codigoCliente ?? '';
                                setFilters({ ...filters, cliente: String(codigo) });
                                setClienteNome(client.nome);
                                setClientSearchOpen(false);
                                setClientSearch('');
                              }}
                            >
                              <TableCell>{client.codigoCliente ?? ''}</TableCell>
                              <TableCell>{client.nome}</TableCell>
                              <TableCell>{enderecoCompleto || '-'}</TableCell>
                              <TableCell>{client.bairro || '-'}</TableCell>
                              <TableCell>{client.cidade}</TableCell>
                              <TableCell>{client.fone || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                        {clients.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
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
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
        <Button onClick={handleNovoPedido} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white" disabled={!canInsert}>
          <FileEdit className="h-4 w-4 mr-2" />
          Digitar Pedido
        </Button>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="default" onClick={handlePesquisar} className="w-full sm:w-auto">
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          <Button variant="outline" onClick={handleLimparFiltros} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[60vh] overflow-auto scrollbar-thin" onScroll={handleOrdersScroll}>
          <Table className="min-w-[650px]">
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
                <TableHead className="hidden lg:table-cell w-10">I</TableHead>
                <TableHead className="w-24">Data</TableHead>
                <TableHead className="w-16">Pedido</TableHead>
                <TableHead className="hidden md:table-cell w-28">Operação</TableHead>
                <TableHead className="hidden lg:table-cell w-24">Cód. Cliente</TableHead>
                <TableHead className="hidden md:table-cell w-40">Vendedor</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24 text-right">Valor</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="hidden lg:table-cell w-24">Nº ADS</TableHead>
                <TableHead className="w-32 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isOrdersInitialLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center h-32 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const isPendente = order.situacao === 'Pendentes';
                  const baseClasses = selectedOrders.includes(order.id) ? 'bg-table-selected' : 'hover:bg-table-hover';
                  const pendenteClasses = isPendente ? 'bg-success/10 hover:bg-success/20' : '';
                  return (
                    <TableRow
                      key={order.id}
                      className={`${baseClasses} ${pendenteClasses}`}
                    >
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell w-10">
                        <div className="w-4 h-4 bg-primary/20 rounded" />
                      </TableCell>
                      <TableCell className="w-24 text-xs">{formatDate(order.data)}</TableCell>
                      <TableCell className="w-16 font-medium text-xs">{order.id}</TableCell>
                      <TableCell className="hidden md:table-cell w-28 text-xs">{formatOperacao(order)}</TableCell>
                      <TableCell className="hidden lg:table-cell w-24 text-xs">{formatClienteCodigo(order)}</TableCell>
                      <TableCell className="hidden md:table-cell w-40 text-xs">
                        <div className="truncate">
                          {formatRepresentanteCodigo(order)
                            ? `${formatRepresentanteCodigo(order)} - ${order.representanteNome ?? ''}`
                            : (order.representanteNome ?? '')}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[260px]">
                        <div className="truncate">{order.clienteNome}</div>
                      </TableCell>
                      <TableCell className="w-24 text-right font-medium text-xs">{formatCurrency(order.valor)}</TableCell>
                      <TableCell className="w-28">
                        <Badge className={situacaoBadgeClasses(order.situacao)} variant="outline">
                          {situacaoLabel(order.situacao)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell w-24 text-xs">
                        {order.numeroPedidoErp || '-'}
                      </TableCell>
                      <TableCell className="w-32">
                        <TooltipProvider>
                          <div className="flex items-center justify-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => attemptAlterar(order)}
                                >
                                  <FileEdit className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Alterar</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hidden sm:flex"
                                  disabled={order.situacao !== 'Pendentes' || enviandoAdsId === order.id}
                                  onClick={() => attemptEnviarAds(order)}
                                >
                                  {enviandoAdsId === order.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Send className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Enviar pro ADS</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hidden sm:flex"
                                  onClick={() => {
                                    setOrderToDuplicate(order);
                                    if (onNavigateToDigitacao) onNavigateToDigitacao();
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Duplicar</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    openPreview(order);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hidden sm:flex"
                                  onClick={() => printOrder(order)}
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Imprimir</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => attemptExcluir(order)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hidden md:flex"
                                  onClick={() => openEmailDialog(order)}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>E-mail</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hidden md:flex"
                                  onClick={async () => {
                                    try {
                                      await exportOrderToExcel(order);
                                      toast.success('Pedido exportado para Excel');
                                    } catch (e: any) {
                                      toast.error(`Erro ao exportar: ${e.message || e}`);
                                    }
                                  }}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Exportar</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {isOrdersLoadingMore && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Total de pedidos filtrados e soma dos valores, independente de seleção */}
      {filteredSummary && (
        <div className="flex items-center justify-between p-3 sm:p-4 bg-card rounded-lg border text-sm">
          <div className="text-muted-foreground">
            {filteredSummary.total} pedido(s) encontrado(s)
          </div>
          <div className="font-semibold">{formatCurrency(filteredSummary.somaValor)}</div>
        </div>
      )}

      {/* Resumo de seleção */}
      {selectedOrders.length > 0 && (
        <div className="flex items-center justify-between p-3 sm:p-4 bg-card rounded-lg border">
          <div className="text-sm text-muted-foreground">
            {selectedOrders.length} pedido(s) selecionado(s)
          </div>
          <div className="flex items-center gap-4">
            <Select
              value=""
              onValueChange={handleChangeStatusSelected}
              disabled={changingStatus}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Mudar status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendentes">Pendente</SelectItem>
                <SelectItem value="Faturados">Faturado</SelectItem>
                <SelectItem value="Cancelados">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcluir}
              disabled={selectedOrders.length !== 1}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir selecionado
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportar}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar selecionados
            </Button>
            <div className="text-right">
              <div className="text-xl font-bold text-primary">{formatCurrency(totalSelecionado)}</div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewOrder ? `Pedido #${previewOrder.id}` : 'Pedido'}</DialogTitle>
          </DialogHeader>
          {previewOrder && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {nomeEmpresa && <div className="font-medium text-foreground">{nomeEmpresa}</div>}
                <div>Data: {formatDate(previewOrder.data)}</div>
                <div>Cliente: {previewOrder.clienteNome}{previewClienteCodigo ? ` (Cód.: ${previewClienteCodigo})` : ''}</div>
                <div>Operação: {formatOperacao(previewOrder)}</div>
                <div>Força de Vendas: {previewRepresentanteCodigo ? `${previewRepresentanteCodigo} - ` : ''}{previewOrder.representanteNome}</div>
                <div>Endereço: {formatEnderecoCliente(previewOrder) || '-'}</div>
                <div>Forma de pagamento: {previewOrder.formaPagamento || '-'}</div>
                <div>Prazo: {previewOrder.prazo || '-'}</div>
              </div>
              {previewLoading && (
                <div className="text-sm text-muted-foreground">Carregando detalhes do pedido...</div>
              )}
              {previewError && (
                <div className="text-sm text-destructive">{previewError}</div>
              )}
              <div className="max-h-[40vh] overflow-y-auto overflow-x-auto scrollbar-thin border rounded-md">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>UN</TableHead>
                      <TableHead>Cód. Tabela</TableHead>
                      <TableHead>Cód. Fábrica</TableHead>
                      <TableHead className="text-right">Quant.</TableHead>
                      <TableHead className="text-right">%Desc</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(previewOrder.itens || []).map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{it.codigoProduto ?? ''}</TableCell>
                        <TableCell>{it.descricao}</TableCell>
                        <TableCell>{it.un}</TableCell>
                        <TableCell>{it.codigoTabelaPreco ?? ''}</TableCell>
                        <TableCell>{it.codigoFabrica ?? ''}</TableCell>
                        <TableCell className="text-right">{it.quant}</TableCell>
                        <TableCell className="text-right">{(it.descontoPerc ?? 0).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(it.preco)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(it.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {previewParcelas.length > 0 && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-1">Parcelas (prazo negociado)</div>
                  <div className="max-h-[30vh] overflow-y-auto scrollbar-thin border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Parc.</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewParcelas.map((p) => (
                          <TableRow key={p.parcela}>
                            <TableCell>{p.parcela}</TableCell>
                            <TableCell>{formatDate(p.vencto)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.valor)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
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

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToDelete
                ? `Pedido #${orderToDelete.id} - ${orderToDelete.clienteNome || 'Cliente não informado'}.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOrder}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExcluir} disabled={deletingOrder}>
              {deletingOrder ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!emailOrder} onOpenChange={(open) => { if (!open) setEmailOrder(null); }}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar pedido por e-mail</DialogTitle>
          </DialogHeader>
          {emailOrder && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Pedido #{emailOrder.id} - {emailOrder.clienteNome || 'Cliente não informado'}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email-to">Para</Label>
                <Input
                  id="email-to"
                  type="email"
                  placeholder="destinatario@exemplo.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email-cc">Cc (opcional, separado por vírgula)</Label>
                <Input
                  id="email-cc"
                  placeholder="copia1@exemplo.com, copia2@exemplo.com"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEmailOrder(null)} disabled={sendingEmail}>
                  Cancelar
                </Button>
                <Button onClick={handleSendEmail} disabled={sendingEmail}>
                  {sendingEmail ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
