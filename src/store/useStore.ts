import { create } from 'zustand';
import type { Order } from '@/services/ordersService';
import type { Client } from '@/services/clientsService';

interface AppState {
  orders: Order[];
  selectedOrders: number[];
  currentOrder: Order | null;
  setOrders: (orders: Order[]) => void;
  setSelectedOrders: (ids: number[]) => void;
  setCurrentOrder: (order: Order | null) => void;
  toggleOrderSelection: (id: number) => void;
  clearSelection: () => void;
}

export const useStore = create<AppState>((set) => ({
  orders: [],
  selectedOrders: [],
  currentOrder: null,
  
  setOrders: (orders) => set({ orders }),
  
  setSelectedOrders: (ids) => set({ selectedOrders: ids }),
  
  setCurrentOrder: (order) => set({ currentOrder: order }),
  
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
