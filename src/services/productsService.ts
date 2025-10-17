import { produtos } from '@/mocks/data';

export type Product = typeof produtos[0];

export const productsService = {
  search: (query?: string) => {
    if (!query) return Promise.resolve(produtos);
    
    const q = query.toLowerCase();
    const filtered = produtos.filter(p => 
      p.descricao.toLowerCase().includes(q) ||
      p.id.toString().includes(q)
    );
    
    return Promise.resolve(filtered);
  },

  getById: (id: number) => {
    const produto = produtos.find(p => p.id === id);
    return Promise.resolve(produto);
  }
};
