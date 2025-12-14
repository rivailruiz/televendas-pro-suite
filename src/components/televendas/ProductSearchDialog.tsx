import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { productsService, type Product } from '@/services/productsService';
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
  pAtivo: string;
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
  pAtivo: '',
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

  // Build query from filters
  const buildQuery = useCallback(() => {
    const parts: string[] = [];
    if (filters.descricao.trim()) parts.push(filters.descricao.trim());
    if (filters.marca.trim()) parts.push(filters.marca.trim());
    if (filters.codFabrica.trim()) parts.push(filters.codFabrica.trim());
    if (filters.ean13.trim()) parts.push(filters.ean13.trim());
    if (filters.dun14.trim()) parts.push(filters.dun14.trim());
    if (filters.pAtivo.trim()) parts.push(filters.pAtivo.trim());
    return parts.join(' ');
  }, [filters]);

  const loadProducts = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const nextPage = reset ? 1 : page + 1;
      const query = buildQuery();
      const data = await productsService.find(query || undefined, nextPage, PRODUCT_LIMIT);
      
      // Client-side filtering for additional criteria
      let filtered = data;
      
      if (filters.comEstoque) {
        filtered = filtered.filter(p => (p.estoque ?? 0) > 0);
      }
      if (filters.estoqueZerado) {
        filtered = filtered.filter(p => p.estoque === 0);
      }
      
      setProducts((prev) => {
        const combined = reset ? filtered : [...prev, ...filtered];
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
  }, [loading, page, buildQuery, filters.comEstoque, filters.estoqueZerado]);

  // Load products when dialog opens
  useEffect(() => {
    if (!open) return;
    loadProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounced search on filter change
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      loadProducts(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.descricao, filters.marca, filters.codFabrica, filters.ean13, filters.dun14, filters.pAtivo, filters.comEstoque, filters.estoqueZerado, filters.tabela]);

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pesquisa Produtos</DialogTitle>
        </DialogHeader>
        
        {/* Filters Section */}
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap min-w-[70px]">Descrição</label>
              <Input
                value={filters.descricao}
                onChange={(e) => setFilters(prev => ({ ...prev, descricao: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap min-w-[50px]">Marca</label>
              <Input
                value={filters.marca}
                onChange={(e) => setFilters(prev => ({ ...prev, marca: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap min-w-[50px]">Tabela</label>
              <Select
                value={filters.tabela}
                onValueChange={(v) => setFilters(prev => ({ ...prev, tabela: v === '_all' ? '' : v }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={loadingTabelas ? '...' : 'Todas'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  {tabelas.map((t) => (
                    <SelectItem key={String(t.id)} value={String(t.id)}>
                      {t.codigo ? `${t.codigo} - ${t.descricao}` : t.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="comEstoque"
                  checked={filters.comEstoque}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, comEstoque: !!checked, estoqueZerado: false }))}
                />
                <label htmlFor="comEstoque" className="text-sm cursor-pointer">Com estoque</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lancamentos"
                  checked={filters.lancamentos}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, lancamentos: !!checked }))}
                />
                <label htmlFor="lancamentos" className="text-sm cursor-pointer">Lançamentos</label>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap min-w-[70px]">Cód.Fabrica</label>
              <Input
                value={filters.codFabrica}
                onChange={(e) => setFilters(prev => ({ ...prev, codFabrica: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap min-w-[70px]">Fornecedor</label>
              <Select
                value={filters.fornecedor}
                onValueChange={(v) => setFilters(prev => ({ ...prev, fornecedor: v === '_all' ? '' : v }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="estoqueZerado"
                  checked={filters.estoqueZerado}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, estoqueZerado: !!checked, comEstoque: false }))}
                />
                <label htmlFor="estoqueZerado" className="text-sm cursor-pointer">Estoque zerado</label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-xs">Últimas compras a partir de:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start text-left font-normal",
                      !filters.ultimasComprasDesde && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.ultimasComprasDesde
                      ? format(filters.ultimasComprasDesde, 'dd/MM/yyyy', { locale: ptBR })
                      : <span>Selecionar</span>}
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
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap min-w-[70px]">Ean13</label>
              <Input
                value={filters.ean13}
                onChange={(e) => setFilters(prev => ({ ...prev, ean13: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap min-w-[70px]">Divisão</label>
              <Select
                value={filters.divisao}
                onValueChange={(v) => setFilters(prev => ({ ...prev, divisao: v === '_all' ? '' : v }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap min-w-[70px]">Dun14</label>
              <Input
                value={filters.dun14}
                onChange={(e) => setFilters(prev => ({ ...prev, dun14: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap min-w-[70px]">P. Ativo</label>
              <Input
                value={filters.pAtivo}
                onChange={(e) => setFilters(prev => ({ ...prev, pAtivo: e.target.value }))}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="flex-1 overflow-auto min-h-[300px] border rounded-lg" onScroll={handleScroll}>
          {loading && products.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Carregando produtos...</div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-destructive">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[120px]">Apresentação</TableHead>
                  <TableHead className="w-[60px]">UN</TableHead>
                  <TableHead className="w-[80px] text-right">Estoque</TableHead>
                  <TableHead className="w-[100px] text-right">Preço</TableHead>
                  <TableHead className="w-[120px]">Cód.Fab</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <TableCell className="font-mono">{product.codigoProduto ?? product.id}</TableCell>
                    <TableCell>{product.descricao}</TableCell>
                    <TableCell>{/* Apresentação - to be mapped from API if available */}</TableCell>
                    <TableCell>{product.un}</TableCell>
                    <TableCell className="text-right">{product.estoque ?? '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.preco)}</TableCell>
                    <TableCell>{product.codigoProduto ?? ''}</TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                )}
                {loading && products.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      Carregando mais...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
