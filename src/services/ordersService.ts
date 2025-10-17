import { pedidos } from '@/mocks/data';

export type Order = typeof pedidos[0];

export const ordersService = {
  list: (filters?: any) => {
    // Mock filtering logic
    let filtered = [...pedidos];
    
    if (filters?.situacao && filters.situacao !== 'Todos') {
      filtered = filtered.filter(p => p.situacao === filters.situacao);
    }
    
    if (filters?.clienteId) {
      filtered = filtered.filter(p => p.clienteId === filters.clienteId);
    }
    
    if (filters?.especial !== undefined) {
      filtered = filtered.filter(p => p.especial === filters.especial);
    }
    
    return Promise.resolve(filtered);
  },

  getById: (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    return Promise.resolve(pedido);
  },

  create: (order: Omit<Order, 'id'>) => {
    const newOrder = {
      ...order,
      id: Math.max(...pedidos.map(p => p.id)) + 1
    };
    pedidos.push(newOrder);
    return Promise.resolve(newOrder);
  },

  update: (id: number, order: Partial<Order>) => {
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) {
      pedidos[index] = { ...pedidos[index], ...order };
      return Promise.resolve(pedidos[index]);
    }
    return Promise.reject('Pedido não encontrado');
  },

  remove: (id: number) => {
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) {
      pedidos.splice(index, 1);
      return Promise.resolve(true);
    }
    return Promise.reject('Pedido não encontrado');
  },

  export: (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (pedido) {
      const dataStr = JSON.stringify(pedido, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedido_${id}_faturamento.json`;
      link.click();
      URL.revokeObjectURL(url);
      return Promise.resolve(true);
    }
    return Promise.reject('Pedido não encontrado');
  },

  duplicate: (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (pedido) {
      const newOrder = {
        ...pedido,
        id: Math.max(...pedidos.map(p => p.id)) + 1,
        data: new Date().toISOString().split('T')[0]
      };
      pedidos.push(newOrder);
      return Promise.resolve(newOrder);
    }
    return Promise.reject('Pedido não encontrado');
  }
};
