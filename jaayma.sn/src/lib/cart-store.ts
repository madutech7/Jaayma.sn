import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/schema";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  shopId: string | null;
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      shopId: null,
      items: [],

      addItem: (product: Product) =>
        set((state) => {
          // If adding a product from a different shop, clear the cart first
          if (state.shopId && state.shopId !== product.shopId) {
            return {
              shopId: product.shopId,
              items: [{ product, quantity: 1 }],
            };
          }

          const existingItem = state.items.find(
            (item) => item.product.id === product.id
          );

          if (existingItem) {
            return {
              shopId: product.shopId,
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }

          return {
            shopId: product.shopId,
            items: [...state.items, { product, quantity: 1 }],
          };
        }),

      removeItem: (productId: string) =>
        set((state) => {
          const newItems = state.items.filter((item) => item.product.id !== productId);
          return {
            items: newItems,
            shopId: newItems.length === 0 ? null : state.shopId,
          };
        }),

      updateQuantity: (productId: string, quantity: number) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        })),

      clearCart: () => set({ items: [], shopId: null }),

      getCartTotal: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      getCartCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: "jaay-cart-storage", // local storage key
    }
  )
);
