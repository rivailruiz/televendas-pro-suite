import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, CalendarIcon, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { productsService, type Product, type ProductFiltersParams } from '@/services/productsService';
import { metadataService, type Tabela } from '@/services/metadataService';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';

interface ProductFilters {
  descricao: string;
  marca: string;
  tabela: string;
  codFabrica: string;
  fornecedor: string;
  ean13: string;
  divisao: string;
  dun14: string;
  pAtivo: boolean;
  comEstoque: boolean;
  lancamentos: boolean;
  estoqueZerado: boolean;
  ultimasComprasDesde: Date | undefined;
}

const emptyFilters: ProductFilters = {
  descricao: '',
  marca: '',
  tabela: '',
  codFabrica: '',
  fornecedor: '',
  ean13: '',
  divisao: '',
  dun14: '',
  pAtivo: false,
  comEstoque: false,
  lancamentos: false,
  estoqueZerado: false,
  ultimasComprasDesde: undefined,
};

interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: Product) => void;
  trigger?: React.ReactNode;
}

export const ProductSearchDialog = ({
  open,
  onOpenChange,
  onSelectProduct,
  trigger,
}: ProductSearchDialogProps) => {
  const [filters, setFilters] = useState<ProductFilters>(emptyFilters);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [loadingTabelas, setLoadingTabelas] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const formatPercent = (value?: number) =>
    value == null ? '-' : `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const formatNumber = (value?: number, maximumFractionDigits = 2) =>
    value == null ? '-' : value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits });
  const formatCurrencyOrDash = (value?: number) => (value == null ? '-' : formatCurrency(value));

  const PRODUCT_LIMIT = 100;

  // Load tabelas on mount
  useEffect(() => {
    const loadTabelas = async () => {
      setLoadingTabelas(true);
      try {
        const data = await metadataService.getTabelas();
        setTabelas(data);
      } catch (e) {
        console.error('Erro ao carregar tabelas:', e);
      } finally {
        setLoadingTabelas(false);
      }
    };
    loadTabelas();
  }, []);

  // Build filters object for API
  const buildFiltersParams = useCallback((): ProductFiltersParams => {
    const params: ProductFiltersParams = {};
    if (filters.descricao.trim()) params.descricao = filters.descricao.trim();
    if (filters.marca.trim()) params.marca = filters.marca.trim();
    if (filters.tabela) params.tabela = filters.tabela;
    if (filters.codFabrica.trim()) params.codFabrica = filters.codFabrica.trim();
    if (filters.fornecedor) params.fornecedor = filters.fornecedor;
    if (filters.ean13.trim()) params.ean13 = filters.ean13.trim();
    if (filters.divisao) params.divisao = filters.divisao;
    if (filters.dun14.trim()) params.dun14 = filters.dun14.trim();
    if (filters.pAtivo) params.pAtivo = true;
    if (filters.comEstoque) params.comEstoque = true;
    if (filters.estoqueZerado) params.estoqueZerado = true;
    if (filters.lancamentos) params.lancamentos = true;
    if (filters.ultimasComprasDesde) {
      params.ultimasComprasDesde = format(filters.ultimasComprasDesde, 'yyyy-MM-dd');
    }
    return params;
  }, [filters]);

  const loadProducts = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const nextPage = reset ? 1 : page + 1;
      const filtersParams = buildFiltersParams();
      const data = await productsService.find(filtersParams, nextPage, PRODUCT_LIMIT);
      
      setProducts((prev) => {
        const combined = reset ? data : [...prev, ...data];
        const seen = new Set<number>();
        return combined.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
      });
      setPage(nextPage);
      setHasMore(Array.isArray(data) && data.length === PRODUCT_LIMIT);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [loading, page, buildFiltersParams]);

  // Load products when dialog opens
  useEffect(() => {
    if (!open) return;
    loadProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSearch = () => {
    loadProducts(true);
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
  };

  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    onOpenChange(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (hasMore && !loading && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadProducts(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pesquisa Produtos</DialogTitle>
        </DialogHeader>
        
        {/* Collapsible Filters Section */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <div className="border rounded-lg p-4 bg-muted/30 flex-shrink-0 overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {/* Column 1 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-20 text-right">Cód.Fabrica</label>
                    <Input
                      value={filters.codFabrica}
                      onChange={(e) => setFilters(prev => ({ ...prev, codFabrica: e.target.value }))}
                      className="h-8 w-32"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-20 text-right">Ean13</label>
                    <Input
                      value={filters.ean13}
                      onChange={(e) => setFilters(prev => ({ ...prev, ean13: e.target.value }))}
                      className="h-8 w-32"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-20 text-right">Dun14</label>
                    <Input
                      value={filters.dun14}
                      onChange={(e) => setFilters(prev => ({ ...prev, dun14: e.target.value }))}
                      className="h-8 w-32"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-16 text-right">Marca</label>
                    <Input
                      value={filters.marca}
                      onChange={(e) => setFilters(prev => ({ ...prev, marca: e.target.value }))}
                      className="h-8 w-32"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-16 text-right">Fornec.</label>
                    <Select
                      value={filters.fornecedor}
                      onValueChange={(v) => setFilters(prev => ({ ...prev, fornecedor: v === '_all' ? '' : v }))}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pAtivo"
                      checked={filters.pAtivo}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, pAtivo: !!checked }))}
                    />
                    <label htmlFor="pAtivo" className="text-sm cursor-pointer whitespace-nowrap">P. Ativo</label>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-14 text-right">Tabela</label>
                    <Select
                      value={filters.tabela}
                      onValueChange={(v) => setFilters(prev => ({ ...prev, tabela: v === '_all' ? '' : v }))}
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue placeholder={loadingTabelas ? '...' : 'Todas'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todas</SelectItem>
                        {tabelas.map((t) => (
                          <SelectItem key={String(t.id)} value={String(t.id)}>
                            {t.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-14 text-right">Divisão</label>
                    <Select
                      value={filters.divisao}
                      onValueChange={(v) => setFilters(prev => ({ ...prev, divisao: v === '_all' ? '' : v }))}
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Column 4 - Checkboxes */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="comEstoque"
                      checked={filters.comEstoque}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, comEstoque: !!checked, estoqueZerado: false }))}
                    />
                    <label htmlFor="comEstoque" className="text-sm cursor-pointer whitespace-nowrap">Com estoque</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="estoqueZerado"
                      checked={filters.estoqueZerado}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, estoqueZerado: !!checked, comEstoque: false }))}
                    />
                    <label htmlFor="estoqueZerado" className="text-sm cursor-pointer whitespace-nowrap">Estoque zerado</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lancamentos"
                      checked={filters.lancamentos}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, lancamentos: !!checked }))}
                    />
                    <label htmlFor="lancamentos" className="text-sm cursor-pointer whitespace-nowrap">Lançamentos</label>
                  </div>
                </div>

                {/* Column 5 - Date and actions */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium whitespace-nowrap">Últ. compras:</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 justify-start text-left font-normal px-2",
                            !filters.ultimasComprasDesde && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1 h-4 w-4" />
                          {filters.ultimasComprasDesde
                            ? format(filters.ultimasComprasDesde, 'dd/MM/yyyy', { locale: ptBR })
                            : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.ultimasComprasDesde}
                          onSelect={(date) => setFilters(prev => ({ ...prev, ultimasComprasDesde: date }))}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Quick search + Filter toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 flex items-center gap-2">
            <Input
              placeholder="Buscar por descrição..."
              value={filters.descricao}
              onChange={(e) => setFilters(prev => ({ ...prev, descricao: e.target.value }))}
              className="h-9 max-w-md"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              size="sm"
              onClick={handleSearch}
              className="h-9"
              disabled={loading}
            >
              <Search className="h-4 w-4 mr-1" />
              Filtrar
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="h-9"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtros
            {filtersOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>

        {/* Products Table */}
        <div className="flex-1 overflow-auto min-h-[250px] border rounded-lg" onScroll={handleScroll}>
          {loading && products.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Carregando produtos...</div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-destructive">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[2200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-xs">Código</TableHead>
                    <TableHead className="text-xs min-w-[220px]">Descrição</TableHead>
                    <TableHead className="w-[80px] text-xs">UN</TableHead>
                    <TableHead className="w-[180px] text-xs">Apresentação</TableHead>
                    <TableHead className="w-[120px] text-xs">Marca</TableHead>
                    <TableHead className="w-[120px] text-xs">Cód. Fábrica</TableHead>
                    <TableHead className="w-[160px] text-xs">Tabela Preço</TableHead>
                    <TableHead className="w-[110px] text-xs text-right">Preço</TableHead>
                    <TableHead className="w-[110px] text-xs text-right">Desc. Máx</TableHead>
                    <TableHead className="w-[100px] text-xs text-right">Comissão</TableHead>
                    <TableHead className="w-[90px] text-xs text-right">Estoque</TableHead>
                    <TableHead className="w-[120px] text-xs text-right">Múltiplo Venda</TableHead>
                    <TableHead className="w-[150px] text-xs text-right">Preço Nac. Cons.</TableHead>
                    <TableHead className="w-[130px] text-xs">EAN13</TableHead>
                    <TableHead className="w-[150px] text-xs">Divisão</TableHead>
                    <TableHead className="w-[170px] text-xs">Fornecedor</TableHead>
                    <TableHead className="w-[170px] text-xs">Princípio Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <TableCell className="font-mono text-xs py-2">{product.id}</TableCell>
                      <TableCell className="text-xs py-2">{product.descricao}</TableCell>
                      <TableCell className="text-xs py-2">{product.un}</TableCell>
                      <TableCell className="text-xs py-2">{product.apresentacao ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.marca ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.codigoFabrica ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.descricaoTabelaPreco ?? '-'}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatCurrency(product.preco)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatPercent(product.descontoMaximo)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatPercent(product.comissao)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatNumber(product.estoque, 3)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatNumber(product.multiploDeVendas, 3)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatCurrencyOrDash(product.precoNacionalConsumidor)}</TableCell>
                      <TableCell className="text-xs py-2">{product.ean13 ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.divisaoDescricao ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.fornecedor ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2">{product.principioAtivo ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && products.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center text-sm text-muted-foreground">
                        Carregando mais...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
