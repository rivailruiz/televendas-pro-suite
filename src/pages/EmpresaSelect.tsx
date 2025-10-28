import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, Empresa } from '@/services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const EmpresaSelect = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const selectedEmpresa = useMemo(
    () => empresas.find(e => String(e.empresa_id) === selectedId),
    [empresas, selectedId]
  );

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    // If an empresa is already selected, jump to app
    const atual = authService.getEmpresa();
    if (atual) {
      navigate('/televendas');
      return;
    }

    setLoading(true);
    authService
      .getEmpresas()
      .then(list => {
        setEmpresas(list);
        if (list.length === 1) {
          // Auto select if only one
          authService.setEmpresa(list[0]);
          navigate('/televendas');
        }
      })
      .catch(err => toast.error(String(err)))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleConfirm = () => {
    if (!selectedEmpresa) {
      toast.error('Selecione uma empresa');
      return;
    }
    authService.setEmpresa(selectedEmpresa);
    toast.success('Empresa selecionada');
    navigate('/televendas');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-3 sm:p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="space-y-1 text-center px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-bold">Selecione a Empresa</CardTitle>
          <CardDescription>Escolha a empresa para continuar</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 space-y-4">
          <div className="space-y-2">
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v)} disabled={loading || empresas.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione'} />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.empresa_id} value={String(e.empresa_id)}>
                    {e.fantasia?.trim() || e.razao_social?.trim() || `Empresa ${e.empresa_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleConfirm} disabled={loading || empresas.length === 0}>Continuar</Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/login')} disabled={loading}>Voltar</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmpresaSelect;

