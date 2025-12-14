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
        
        {/* Filters Section */}
        <div className="border rounded-lg p-3 space-y-2 bg-muted/30 flex-shrink-0">
          {/* Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="col-span-2 flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap w-16">Descrição</label>
              <Input
                value={filters.descricao}
                onChange={(e) => setFilters(prev => ({ ...prev, descricao: e.target.value }))}
                className="h-7 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap w-12">Marca</label>
              <Input
                value={filters.marca}
                onChange={(e) => setFilters(prev => ({ ...prev, marca: e.target.value }))}
                className="h-7 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap w-12">Tabela</label>
              <Select
                value={filters.tabela}
                onValueChange={(v) => setFilters(prev => ({ ...prev, tabela: v === '_all' ? '' : v }))}
              >
                <SelectTrigger className="h-7 text-sm">
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
            <div className="col-span-2 flex items-center gap-3 flex-wrap">
              <div className="flex items-center space-x-1">
                <Checkbox
                  id="comEstoque"
                  checked={filters.comEstoque}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, comEstoque: !!checked, estoqueZerado: false }))}
                  className="h-4 w-4"
                />
                <label htmlFor="comEstoque" className="text-xs cursor-pointer whitespace-nowrap">Com estoque</label>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  id="lancamentos"
                  checked={filters.lancamentos}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, lancamentos: !!checked }))}
                  className="h-4 w-4"
                />
                <label htmlFor="lancamentos" className="text-xs cursor-pointer whitespace-nowrap">Lançamentos</label>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  id="estoqueZerado"
                  checked={filters.estoqueZerado}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, estoqueZerado: !!checked, comEstoque: false }))}
                  className="h-4 w-4"
                />
                <label htmlFor="estoqueZerado" className="text-xs cursor-pointer whitespace-nowrap">Estoque zerado</label>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap w-16">Cód.Fab</label>
              <Input
                value={filters.codFabrica}
                onChange={(e) => setFilters(prev => ({ ...prev, codFabrica: e.target.value }))}
                className="h-7 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap w-16">Fornec.</label>
              <Select
                value={filters.fornecedor}
                onValueChange={(v) => setFilters(prev => ({ ...prev, fornecedor: v === '_all' ? '' : v }))}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap w-12">Ean13</label>
              <Input
                value={filters.ean13}
                onChange={(e) => setFilters(prev => ({ ...prev, ean13: e.target.value }))}
                className="h-7 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap w-12">Divisão</label>
              <Select
                value={filters.divisao}
                onValueChange={(v) => setFilters(prev => ({ ...prev, divisao: v === '_all' ? '' : v }))}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap w-12">Dun14</label>
              <Input
                value={filters.dun14}
                onChange={(e) => setFilters(prev => ({ ...prev, dun14: e.target.value }))}
                className="h-7 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap w-12">P. Ativo</label>
              <Input
                value={filters.pAtivo}
                onChange={(e) => setFilters(prev => ({ ...prev, pAtivo: e.target.value }))}
                className="h-7 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          {/* Row 3 - Date and Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium whitespace-nowrap">Últ. compras desde:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs justify-start text-left font-normal px-2",
                      !filters.ultimasComprasDesde && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={handleSearch}
                className="h-7 text-xs"
                disabled={loading}
              >
                <Search className="h-3 w-3 mr-1" />
                Buscar
              </Button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="flex-1 overflow-auto min-h-[250px] border rounded-lg" onScroll={handleScroll}>
          {loading && products.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Carregando produtos...</div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-destructive">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px] text-xs">Código</TableHead>
                    <TableHead className="text-xs min-w-[200px]">Descrição</TableHead>
                    <TableHead className="w-[100px] text-xs">Apresentação</TableHead>
                    <TableHead className="w-[50px] text-xs">UN</TableHead>
                    <TableHead className="w-[70px] text-xs text-right">Estoque</TableHead>
                    <TableHead className="w-[80px] text-xs text-right">Preço</TableHead>
                    <TableHead className="w-[90px] text-xs">Cód.Fab</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <TableCell className="font-mono text-xs py-2">{product.codigoProduto ?? product.id}</TableCell>
                      <TableCell className="text-xs py-2">{product.descricao}</TableCell>
                      <TableCell className="text-xs py-2">{/* Apresentação */}</TableCell>
                      <TableCell className="text-xs py-2">{product.un}</TableCell>
                      <TableCell className="text-xs text-right py-2">{product.estoque ?? '-'}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatCurrency(product.preco)}</TableCell>
                      <TableCell className="text-xs py-2">{product.codigoProduto ?? ''}</TableCell>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
