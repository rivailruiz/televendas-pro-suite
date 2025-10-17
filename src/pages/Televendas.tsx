import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Search, FileText, Route, Users, UserPlus, FileEdit } from 'lucide-react';
import { PesquisaTab } from '@/components/televendas/PesquisaTab';
import { toast } from 'sonner';

const Televendas = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    toast.success('Logout realizado com sucesso');
    navigate('/login');
  };

  const session = authService.getSession();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Módulo Televendas</h1>
            <p className="text-sm text-muted-foreground">Usuário: {session?.nome}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="pesquisa" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 mb-6">
            <TabsTrigger value="pesquisa" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Pesquisa</span>
            </TabsTrigger>
            <TabsTrigger value="dados" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Dados do pedido</span>
            </TabsTrigger>
            <TabsTrigger value="itinerarios" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              <span className="hidden sm:inline">Itinerários</span>
            </TabsTrigger>
            <TabsTrigger value="visitas" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Visitas</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Cadastro de clientes</span>
            </TabsTrigger>
            <TabsTrigger value="digitacao" className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              <span className="hidden sm:inline">Digitação</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pesquisa" className="space-y-4">
            <PesquisaTab />
          </TabsContent>

          <TabsContent value="dados" className="space-y-4">
            <div className="p-8 text-center border rounded-lg bg-card">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Dados do Pedido</h3>
              <p className="text-muted-foreground">Selecione um pedido na aba Pesquisa para visualizar os detalhes</p>
            </div>
          </TabsContent>

          <TabsContent value="itinerarios" className="space-y-4">
            <div className="p-8 text-center border rounded-lg bg-card">
              <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Itinerários</h3>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </div>
          </TabsContent>

          <TabsContent value="visitas" className="space-y-4">
            <div className="p-8 text-center border rounded-lg bg-card">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Visitas</h3>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </div>
          </TabsContent>

          <TabsContent value="clientes" className="space-y-4">
            <div className="p-8 text-center border rounded-lg bg-card">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Cadastro de Clientes</h3>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </div>
          </TabsContent>

          <TabsContent value="digitacao" className="space-y-4">
            <div className="p-8 text-center border rounded-lg bg-card">
              <FileEdit className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Digitação de Pedidos</h3>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Televendas;
