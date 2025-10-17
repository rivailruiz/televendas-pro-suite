import { usuarios } from '@/mocks/data';

export const authService = {
  login: (usuario: string, senha: string) => {
    const user = usuarios.find(
      u => u.usuario === usuario && u.senha === senha
    );
    
    if (user) {
      const session = {
        usuario: user.usuario,
        nome: user.nome,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('session', JSON.stringify(session));
      return { success: true, user: session };
    }
    
    return { success: false, error: 'Usuário ou senha inválidos' };
  },

  logout: () => {
    localStorage.removeItem('session');
  },

  getSession: () => {
    const session = localStorage.getItem('session');
    return session ? JSON.parse(session) : null;
  },

  isAuthenticated: () => {
    return !!authService.getSession();
  }
};
