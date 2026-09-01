import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Lock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  adminService,
  type AdminEmpresa,
  type ZerarBaseOpcoes,
  type ZerarBaseResultado,
} from '@/services/adminService';

interface ZerarBaseDialogProps {
  empresa: AdminEmpresa | null;
  empresasTodas: AdminEmpresa[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecutado?: () => void;
}

export function ZerarBaseDialog({
  empresa,
  empresasTodas,
  open,
  onOpenChange,
  onExecutado,
}: ZerarBaseDialogProps) {
  const [opcoes, setOpcoes] = useState<ZerarBaseOpcoes | null>(null);
  const [loadingOpcoes, setLoadingOpcoes] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<ZerarBaseResultado | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [executando, setExecutando] = useState(false);
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !empresa) return;
    setOpcoes(null);
    setSelecionados(new Set());
    setPreview(null);
    setConfirmText('');
    setLoadingOpcoes(true);
    adminService
      .getZerarBaseOpcoes(empresa.empresa_id)
      .then(setOpcoes)
      .catch((e: any) => {
        toast.error(e?.message || 'Erro ao carregar opções de zerar base');
        onOpenChange(false);
      })
      .finally(() => setLoadingOpcoes(false));
  }, [open, empresa]);

  useEffect(() => {
    if (!empresa || !opcoes) return;
    if (previewDebounce.current) clearTimeout(previewDebounce.current);
    if (selecionados.size === 0) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    previewDebounce.current = setTimeout(async () => {
      try {
        const data = await adminService.previewZerarBase(
          empresa.empresa_id,
          Array.from(selecionados),
        );
        setPreview(data);
      } catch (e: any) {
        toast.error(e?.message || 'Erro ao calcular preview');
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 350);
  }, [selecionados, empresa, opcoes]);

  if (!empresa) return null;

  const gruposForcados = new Set(preview?.plano.gruposForcados ?? []);
  const cadastroDesabilitado = opcoes ? !opcoes.empresaEhCadastro : true;

  const toggleGrupo = (chave: string, valor: boolean) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (valor) next.add(chave);
      else next.delete(chave);
      return next;
    });
  };

  const nomeEsperado = [empresa.razao_social, empresa.fantasia]
    .filter(Boolean)
    .map((n) => String(n).trim().toLowerCase());
  const confirmacaoOk = nomeEsperado.includes(confirmText.trim().toLowerCase());

  const totalRegistros = (preview?.contagens ?? []).reduce((acc, c) => acc + c.quantidade, 0);
  const empresasAfetadasExtras = (preview?.plano.empresasAfetadas ?? []).filter(
    (id) => id !== empresa.empresa_id,
  );

  const nomeEmpresa = (id: number) => {
    const found = empresasTodas.find((e) => e.empresa_id === id);
    return found ? found.fantasia || found.razao_social : `#${id}`;
  };

  const contagensPorGrupo = new Map<string, number>();
  for (const c of preview?.contagens ?? []) {
    contagensPorGrupo.set(c.grupo, (contagensPorGrupo.get(c.grupo) ?? 0) + c.quantidade);
  }

  const handleExecutar = async () => {
    if (!confirmacaoOk || selecionados.size === 0) return;
    setExecutando(true);
    try {
      const resultado = await adminService.executarZerarBase(
        empresa.empresa_id,
        Array.from(selecionados),
        confirmText.trim(),
      );
      const total = resultado.contagens.reduce((acc, c) => acc + c.quantidade, 0);
      toast.success(`Base zerada: ${total} registro(s) apagado(s)`);
      onOpenChange(false);
      onExecutado?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao zerar base');
    } finally {
      setExecutando(false);
    }
  };

  const renderGrupo = (chave: string, label: string, disabledSecao: boolean) => {
    const forcado = gruposForcados.has(chave);
    const marcado = selecionados.has(chave) || forcado;
    const disabled = disabledSecao || forcado;
    return (
      <div key={chave} className="flex items-center gap-2 py-1">
        <Checkbox
          id={`zb-${chave}`}
          checked={marcado}
          disabled={disabled}
          onCheckedChange={(v) => toggleGrupo(chave, Boolean(v))}
        />
        <Label
          htmlFor={`zb-${chave}`}
          className={cn(
            'text-xs cursor-pointer flex items-center gap-1',
            disabled && 'cursor-not-allowed text-muted-foreground',
          )}
        >
          {label}
          {forcado && <Lock className="h-3 w-3 text-muted-foreground" />}
        </Label>
        {contagensPorGrupo.has(chave) && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {contagensPorGrupo.get(chave)} registro(s)
          </span>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!executando) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Zerar Base — {empresa.fantasia || empresa.razao_social}
          </DialogTitle>
          <DialogDescription>
            Marque os cadastros e/ou a movimentação que quer apagar. Dependências obrigatórias
            são marcadas automaticamente (cadeado) — não é possível desmarcá-las sem também
            desmarcar quem as exige.
          </DialogDescription>
        </DialogHeader>

        {loadingOpcoes || !opcoes ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {cadastroDesabilitado && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cadastros indisponíveis aqui</AlertTitle>
                <AlertDescription>
                  Esta empresa é filial de{' '}
                  <strong>
                    {opcoes.empresaMatriz?.fantasia || opcoes.empresaMatriz?.razao_social || `#${opcoes.empresaCadastroId}`}
                  </strong>
                  . Cadastros (produtos, clientes, fornecedores, etc.) são compartilhados pelo
                  grupo e só podem ser zerados a partir da matriz. Aqui você só pode zerar dados
                  operacionais desta empresa.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <p className="text-xs font-semibold mb-1">Cadastros</p>
              <div className={cn('grid grid-cols-2 gap-x-4 rounded-md border p-2', cadastroDesabilitado && 'opacity-60')}>
                {opcoes.grupos
                  .filter((g) => g.categoria === 'cadastro')
                  .map((g) => renderGrupo(g.chave, g.label, cadastroDesabilitado))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold mb-1">Operacional</p>
              <div className="grid grid-cols-2 gap-x-4 rounded-md border p-2">
                {opcoes.grupos
                  .filter((g) => g.categoria === 'operacional')
                  .map((g) => renderGrupo(g.chave, g.label, false))}
              </div>
            </div>

            {loadingPreview && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Calculando impacto...
              </div>
            )}

            {!loadingPreview && preview && selecionados.size > 0 && (
              <div className="space-y-2">
                <Separator />
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{totalRegistros} registro(s) serão apagados permanentemente</AlertTitle>
                  <AlertDescription>
                    {preview.plano.gruposForcados.length > 0 && (
                      <p className="mb-1">
                        Também serão apagados por dependência:{' '}
                        {preview.plano.gruposForcados
                          .map((g) => opcoes.grupos.find((og) => og.chave === g)?.label ?? g)
                          .join(', ')}
                        .
                      </p>
                    )}
                    {empresasAfetadasExtras.length > 0 && (
                      <p className="mb-1">
                        Como os cadastros são compartilhados, isso também vai apagar a
                        movimentação/estoque/usuários de {empresasAfetadasExtras.length} outra(s)
                        empresa(s) do grupo:{' '}
                        {empresasAfetadasExtras.map((id) => nomeEmpresa(id)).join(', ')}.
                      </p>
                    )}
                    {preview.nulificacoes.some((n) => n.quantidade > 0) && (
                      <p>
                        {preview.nulificacoes.reduce((acc, n) => acc + n.quantidade, 0)} referência(s)
                        opcionais serão apenas desvinculadas (não apagadas).
                      </p>
                    )}
                  </AlertDescription>
                </Alert>

                {preview.contagens.some((c) => c.quantidade > 0) && (
                  <ScrollArea className="max-h-32 rounded-md border p-2">
                    <ul className="text-[11px] space-y-0.5">
                      {preview.contagens
                        .filter((c) => c.quantidade > 0)
                        .map((c, i) => (
                          <li key={`${c.tabela}-${c.empresaId}-${i}`} className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              {c.tabela}
                              {c.empresaId !== empresa.empresa_id ? ` (${nomeEmpresa(c.empresaId)})` : ''}
                            </span>
                            <span className="font-medium">{c.quantidade}</span>
                          </li>
                        ))}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            )}

            <Separator />

            <div className="space-y-1">
              <Label className="text-xs">
                Pra confirmar, digite a razão social ou nome fantasia da empresa:{' '}
                <strong>{empresa.fantasia || empresa.razao_social}</strong>
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={empresa.fantasia || empresa.razao_social}
                className="text-sm"
                disabled={selecionados.size === 0}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={executando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleExecutar}
            disabled={
              executando ||
              loadingPreview ||
              selecionados.size === 0 ||
              !preview ||
              !confirmacaoOk
            }
          >
            {executando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Zerar Base
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
