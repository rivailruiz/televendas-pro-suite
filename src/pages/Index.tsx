import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { authService } from '@/services/authService';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      const empresa = authService.getEmpresa();
      if (empresa) {
        navigate('/televendas');
      } else {
        navigate('/empresa');
      }
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-5xl font-bold text-foreground">Sistema de Ads Vendas</h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
          Gerencie pedidos, clientes e vendas de forma eficiente
        </p>
        <Button size="lg" onClick={() => navigate('/login')} className="mt-8">
          Acessar Sistema
        </Button>
      </div>
    </div>
  );
};

export default Index;
