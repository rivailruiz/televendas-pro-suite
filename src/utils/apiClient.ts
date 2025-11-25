import { authService } from '@/services/authService';
import { toast } from 'sonner';

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const apiClient = {
  async fetch(url: string, options: FetchOptions = {}) {
    const { requiresAuth = true, ...fetchOptions } = options;

    // Add auth token if required
    if (requiresAuth) {
      const token = authService.getToken();
      if (token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
    }

    try {
      const response = await fetch(url, fetchOptions);

      // Handle token expiration
      if (response.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
        authService.logout();
        window.location.href = '/login';
        throw new Error('Token expirado');
      }

      return response;
    } catch (error) {
      // If it's a network error, just rethrow
      if (error instanceof Error && error.message === 'Token expirado') {
        throw error;
      }
      throw error;
    }
  },
};
