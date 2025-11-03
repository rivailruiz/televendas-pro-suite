export interface Empresa {
  empresa_id: number;
  razao_social: string;
  fantasia: string;
}
import { API_BASE } from '@/utils/env';

export const authService = {
  login: async (usuario: string, senha: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario, senha }),
        // Fluxo baseado em token no corpo da resposta (sem cookies)
        credentials: 'omit',
      });

      // Try to extract error details if not OK
      if (!res.ok) {
        try {
          const errData = await res.json();
          const message =
            errData?.error?.message ||
            errData?.message ||
            (typeof errData?.error === 'string' ? errData.error : undefined) ||
            res.statusText ||
            'Falha no login';
          return { success: false, error: message } as const;
        } catch {
          return { success: false, error: 'Falha no login' } as const;
        }
      }

      const data: any = await res.json();

      // Normalize a session object based on common API fields
      const token =
        data?.token ??
        data?.accessToken ??
        data?.jwt ??
        data?.access_token ??
        data?.idToken ??
        data?.id_token;

      if (!token) {
        return { success: false, error: 'Token não recebido do servidor' } as const;
      }

      const session = {
        usuario: data?.usuario ?? usuario,
        nome: data?.nome ?? data?.name ?? data?.username ?? usuario,
        token,
        // Keep full payload for potential future use
        payload: data,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem('session', JSON.stringify(session));
      return { success: true, user: session } as const;
    } catch (e) {
      return { success: false, error: 'Erro de conexão com o servidor' } as const;
    }
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
  },

  getToken: () => {
    const session = authService.getSession();
    return session?.token;
  },

  getEmpresas: async (): Promise<Empresa[]> => {
    const token = authService.getToken();
    if (!token) return Promise.reject('Token ausente');

    try {
      const headers: Record<string, string> = { accept: '*/*', Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/auth/empresas`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        let message = 'Falha ao buscar empresas';
        try {
          const errData = await res.json();
          message = errData?.message || errData?.error || message;
        } catch {}
        return Promise.reject(message);
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return Promise.reject('Erro de conexão com o servidor');
    }
  },

  setEmpresa: (empresa: Empresa | null) => {
    const session = authService.getSession();
    if (!session) return;
    const updated = { ...session, empresa };
    localStorage.setItem('session', JSON.stringify(updated));
  },

  getEmpresa: (): Empresa | null => {
    const session = authService.getSession();
    return session?.empresa ?? null;
  },
};
