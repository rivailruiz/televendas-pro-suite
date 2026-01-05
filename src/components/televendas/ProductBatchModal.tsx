import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

interface Batch {
  lote: string;
  validade: string;
  quantidade: number;
}

interface StockByCompany {
  empresa: string;
  estoque: number;
}

interface ProductBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtoId: number;
  produtoDescricao: string;
  estoqueAtual?: number;
}

// Mock data - replace with actual API call when available
const mockBatches: Batch[] = [
  { lote: '0361125', validade: '30/11/2027', quantidade: 268.0 },
];

const mockStockByCompany: StockByCompany[] = [
  { empresa: 'VLMED DISTRIBUIDORA', estoque: 268.0 },
  { empresa: 'VLMED DISTRIBUIDORA', estoque: 0.0 },
];

export const ProductBatchModal = ({
  open,
  onOpenChange,
  produtoDescricao,
  estoqueAtual = 0,
}: ProductBatchModalProps) => {
  // TODO: Replace with actual API call using produtoId
  const batches = mockBatches;
  const stockByCompany = mockStockByCompany;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle>Estoque</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          {/* Current stock header */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Estoque atual</span>
            <Input
              readOnly
              value={estoqueAtual.toFixed(0)}
              className="w-24 h-8 text-center bg-muted/50"
            />
          </div>

          {/* Batches table */}
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-medium py-2">Lote</TableHead>
                  <TableHead className="text-primary-foreground font-medium py-2">Validade</TableHead>
                  <TableHead className="text-primary-foreground font-medium py-2 text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch, idx) => (
                  <TableRow key={idx} className="bg-primary/10 hover:bg-primary/20">
                    <TableCell className="py-2">{batch.lote}</TableCell>
                    <TableCell className="py-2">{batch.validade}</TableCell>
                    <TableCell className="py-2 text-right">{batch.quantidade.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {batches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      Nenhum lote encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Stock by company table */}
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-medium py-2">Empresa</TableHead>
                  <TableHead className="text-primary-foreground font-medium py-2 text-right">Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockByCompany.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="py-2">{item.empresa}</TableCell>
                    <TableCell className="py-2 text-right">{item.estoque.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {stockByCompany.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                      Nenhum dado de estoque por empresa
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
