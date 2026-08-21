import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Workflow, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { operacoesService, Operacao, OperacaoFormData, TipoOperacaoAdsErp } from '@/services/operacoesService';
import { useModuleCrudPermission } from '@/hooks/use-module-crud-permission';

const toUpperValue = (value: string | number | null | undefined) => String(value ?? '').toUpperCase();

const initialFormData: OperacaoFormData = {
  codigo_operacao: '',
  descricao_operacao: '',
  tipo: '',
  tipo_operacao_id: '',
};

export function OperacoesTab() {
  const { canInsert } = useModuleCrudPermission('OPERACOES');
  const PAGE_LIMIT = 100;
  const [loading, setLoading] = useState(false);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState<OperacaoFormData>(initialFormData);

  const [tiposAdsErp, setTiposAdsErp] = useState<TipoOperacaoAdsErp[]>([]);
  const [tiposLoading, setTiposLoading] = useState(false);

  useEffect(() => {
    setTiposLoading(true);
    operacoesService.getTiposAdsErp()
      .then(setTiposAdsErp)
      .catch(() => toast.error('Erro ao carregar tipos de operação'))
      .finally(() => setTiposLoading(false));
  }, []);

  const loadOperacoes = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    if (reset) {
      setOperacoes([]);
      setPage(1);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 1 : page + 1;
      const result = await operacoesService.getAll(search, nextPage, PAGE_LIMIT);
      setOperacoes((prev) => (reset ? result.data : [...prev, ...result.data]));
      setPage(result.page ?? nextPage);
      const total = result.total ?? 0;
      const nextHasMore = total ? nextPage * PAGE_LIMIT < total : result.data.length === PAGE_LIMIT;
      setHasMore(nextHasMore);
    } catch (error: any) {
      console.error('Erro ao carregar operações:', error);
      toast.error(error?.message || 'Erro ao carregar operações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperacoes(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => loadOperacoes(true);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditId(null);
  };

  const openCreate = () => {
    if (!canInsert) return;
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = async (o: Operacao) => {
    setEditId(o.operacao_id);
    setFormLoading(true);
    setEditOpen(true);
    try {
      const detail = await operacoesService.getById(o.operacao_id);
      if (detail) {
        setFormData({
          codigo_operacao: detail.codigo_operacao || '',
          descricao_operacao: detail.descricao_operacao || '',
          tipo: detail.tipo || '',
          tipo_operacao_id: detail.tipo_operacao_id || '',
        });
      }
    } catch (e: any) {
      toast.error('Erro ao carregar dados da operação');
      setEditOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.descricao_operacao.trim()) {
      toast.error('Preencha o campo obrigatório: Descrição');
      return false;
    }
    if (!formData.tipo.trim()) {
      toast.error('Preencha o campo obrigatório: Tipo');
      return false;
    }
    if (!formData.tipo_operacao_id.trim()) {
      toast.error('Selecione o Tipo de operação (ADS/ERP)');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      await operacoesService.create(formData);
      toast.success('Operação criada com sucesso');
      setCreateOpen(false);
      resetForm();
      loadOperacoes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar operação');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      await operacoesService.update(editId, formData);
      toast.success('Operação atualizada com sucesso');
      setEditOpen(false);
      resetForm();
      loadOperacoes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar operação');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: number) => setDeleteConfirm(id);

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleteConfirm(null);
    setDeleteLoading(id);
    try {
      await operacoesService.delete(id);
      toast.success('Operação excluída com sucesso');
      loadOperacoes(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir operação');
    } finally {
      setDeleteLoading(null);
    }
  };

  const tipoDescricao = (tipoOperacaoId: string) =>
    tiposAdsErp.find((t) => t.tipo_operacao_id === tipoOperacaoId)?.descricao_tipo_operacao || tipoOperacaoId;

  const tipoLabel = (tipo: string) =>
    tipo === 'E' ? 'E - Entrada' : tipo === 'S' ? 'S - Saída' : tipo || '-';

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Código</label>
          <Input
            className="h-8 text-sm"
            placeholder="Gerado automaticamente se vazio"
            value={formData.codigo_operacao}
            onChange={(e) => setFormData({ ...formData, codigo_operacao: e.target.value })}
          />
        </div>
        <div className="col-span-1 md:col-span-8">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
          <Input
            className="h-8 text-sm"
            value={formData.descricao_operacao}
            onChange={(e) => setFormData({ ...formData, descricao_operacao: toUpperValue(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo *</label>
          <Select
            value={formData.tipo || 'none'}
            onValueChange={(v) => setFormData({ ...formData, tipo: v === 'none' ? '' : v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione</SelectItem>
              <SelectItem value="E">E - Entrada</SelectItem>
              <SelectItem value="S">S - Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 md:col-span-8">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de operação (ADS/ERP) *</label>
          <Select
            value={formData.tipo_operacao_id || 'none'}
            onValueChange={(v) => setFormData({ ...formData, tipo_operacao_id: v === 'none' ? '' : v })}
            disabled={tiposLoading}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={tiposLoading ? 'Carregando...' : 'Selecione'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione</SelectItem>
              {tiposAdsErp.map((t) => (
                <SelectItem key={t.tipo_operacao_id} value={t.tipo_operacao_id}>
                  {t.descricao_tipo_operacao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const isInitialLoading = loading && operacoes.length === 0;
  const isLoadingMore = loading && operacoes.length > 0;

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadOperacoes();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Operações ({operacoes.length})
            </CardTitle>
            <Button variant="default" onClick={openCreate} size="sm" disabled={!canInsert}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Operação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Buscar por código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button variant="default" onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[60vh] overflow-auto scrollbar-thin" onScroll={handleListScroll}>
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">Tipo ADS/ERP</TableHead>
                    <TableHead className="w-28 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : operacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma operação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    operacoes.map((o) => (
                      <TableRow key={o.operacao_id}>
                        <TableCell className="font-mono text-xs">{o.codigo_operacao || '-'}</TableCell>
                        <TableCell className="font-medium">{o.descricao_operacao}</TableCell>
                        <TableCell className="hidden md:table-cell">{tipoLabel(o.tipo)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{tipoDescricao(o.tipo_operacao_id)}</TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <div className="flex items-center justify-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => openEdit(o)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDelete(o.operacao_id)}
                                    disabled={deleteLoading === o.operacao_id}
                                  >
                                    {deleteLoading === o.operacao_id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {isLoadingMore && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Operação</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="default" onClick={handleCreate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Operação</DialogTitle>
          </DialogHeader>
          {formLoading && !formData.descricao_operacao ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            formContent
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button variant="default" onClick={handleUpdate} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta operação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
