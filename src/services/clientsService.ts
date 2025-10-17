import { clientes } from '@/mocks/data';

export type Client = typeof clientes[0];

export const clientsService = {
  search: (query?: string, filters?: any) => {
    let filtered = [...clientes];
    
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(c => 
        c.nome.toLowerCase().includes(q) ||
        c.id.toString().includes(q)
      );
    }
    
    if (filters?.cidade) {
      filtered = filtered.filter(c => c.cidade === filters.cidade);
    }
    
    if (filters?.uf) {
      filtered = filtered.filter(c => c.uf === filters.uf);
    }
    
    if (filters?.bairro) {
      filtered = filtered.filter(c => 
        c.bairro.toLowerCase().includes(filters.bairro.toLowerCase())
      );
    }
    
    return Promise.resolve(filtered);
  },

  getById: (id: number) => {
    const cliente = clientes.find(c => c.id === id);
    return Promise.resolve(cliente);
  }
};
