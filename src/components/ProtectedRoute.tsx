import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '@/services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmpresa?: boolean;
}

export const ProtectedRoute = ({ children, requireEmpresa = false }: ProtectedRouteProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasEmpresa, setHasEmpresa] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const empresa = authService.getEmpresa();
      
      setIsAuthenticated(authenticated);
      setHasEmpresa(!!empresa);
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireEmpresa && !hasEmpresa) {
    return <Navigate to="/empresa" replace />;
  }

  return <>{children}</>;
};
