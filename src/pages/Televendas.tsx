import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Search, FileText, Route, Users, UserPlus, FileEdit } from 'lucide-react';
import { PesquisaTab } from '@/components/televendas/PesquisaTab';
import { DadosTab } from '@/components/televendas/DadosTab';
import { ItinerariosTab } from '@/components/televendas/ItinerariosTab';
import { VisitasTab } from '@/components/televendas/VisitasTab';
import { ClientesTab } from '@/components/televendas/ClientesTab';
import { DigitacaoTab } from '@/components/televendas/DigitacaoTab';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from 'sonner';

const Televendas = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pesquisa');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Gate rendering until auth + empresa checados
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (!authService.getToken()) {
      navigate('/login');
      return;
    }
    if (!authService.getEmpresa()) {
      navigate('/empresa');
      return;
    }
    setReady(true);
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    toast.success('Logout realizado com sucesso');
    navigate('/login');
  };

  const session = authService.getSession();
  const empresa = authService.getEmpresa();

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <h1 className="text-lg sm:text-2xl font-bold text-primary">Ads Vendas</h1>
          </div>
        </header>
        <main className="container mx-auto px-2 sm:px-4 py-6">
          <div className="text-sm text-muted-foreground">Carregando...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-primary">Ads Vendas</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Usuário: {session?.nome}</p>
            {empresa && (
              <p className="text-xs sm:text-sm text-muted-foreground">Empresa: {empresa.fantasia?.trim() || empresa.razao_social?.trim()}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <Tabs defaultValue="pesquisa" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto mb-4 sm:mb-6 -mx-2 px-2">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full grid-cols-3 sm:grid-cols-6 gap-1">{/* Changed to allow horizontal scroll on mobile */}
              <TabsTrigger value="pesquisa" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap px-3">
                <Search className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Pesquisa</span>
              </TabsTrigger>
              <TabsTrigger value="dados" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap px-3">
                <FileText className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Dados</span>
              </TabsTrigger>
              <TabsTrigger value="itinerarios" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap px-3">
                <Route className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Itinerários</span>
              </TabsTrigger>
              <TabsTrigger value="visitas" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap px-3">
                <Users className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Visitas</span>
              </TabsTrigger>
              <TabsTrigger value="clientes" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap px-3">
                <UserPlus className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Clientes</span>
              </TabsTrigger>
              <TabsTrigger value="digitacao" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap px-3">
                <FileEdit className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Digitação</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pesquisa" className="space-y-4">
            <ErrorBoundary>
              <PesquisaTab onNavigateToDigitacao={() => setActiveTab('digitacao')} />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="dados" className="space-y-4">
            <ErrorBoundary>
              <DadosTab />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="itinerarios" className="space-y-4">
            <ErrorBoundary>
              <ItinerariosTab />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="visitas" className="space-y-4">
            <ErrorBoundary>
              <VisitasTab />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="clientes" className="space-y-4">
            <ErrorBoundary>
              <ClientesTab />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="digitacao" className="space-y-4">
            <ErrorBoundary>
              <DigitacaoTab />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Televendas;
