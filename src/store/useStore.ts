import { create } from 'zustand';
import type { Order } from '@/services/ordersService';
import type { Client } from '@/services/clientsService';

interface AppState {
  orders: Order[];
  selectedOrders: number[];
  currentOrder: Order | null;
  // Pedido selecionado no histórico para duplicar como um pedido NOVO
  // (diferente de currentOrder, que edita o pedido original no lugar).
  orderToDuplicate: Order | null;
  setOrders: (orders: Order[]) => void;
  setSelectedOrders: (ids: number[]) => void;
  setCurrentOrder: (order: Order | null) => void;
  setOrderToDuplicate: (order: Order | null) => void;
  toggleOrderSelection: (id: number) => void;
  clearSelection: () => void;
}

export const useStore = create<AppState>((set) => ({
  orders: [],
  selectedOrders: [],
  currentOrder: null,
  orderToDuplicate: null,

  setOrders: (orders) => set({ orders }),

  setSelectedOrders: (ids) => set({ selectedOrders: ids }),

  setCurrentOrder: (order) => set({ currentOrder: order }),

  setOrderToDuplicate: (order) => set({ orderToDuplicate: order }),
  
  toggleOrderSelection: (id) => set((state) => {
    const isSelected = state.selectedOrders.includes(id);
    return {
      selectedOrders: isSelected
        ? state.selectedOrders.filter(orderId => orderId !== id)
        : [...state.selectedOrders, id]
    };
  }),
  
  clearSelection: () => set({ selectedOrders: [] })
}));
