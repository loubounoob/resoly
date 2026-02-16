import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from '@/lib/shopify';

export type { CartItem } from '@/lib/shopify';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existing = get().items.find(i => i.variantId === item.variantId);
        if (existing) {
          set({ items: get().items.map(i => i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i) });
        } else {
          set({ items: [...get().items, item] });
        }
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        set({ items: get().items.map(i => i.variantId === variantId ? { ...i, quantity } : i) });
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter(i => i.variantId !== variantId) });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'shopify-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
