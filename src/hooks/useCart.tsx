import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface CartItem {
  productId: number;
  commerceId: number;
  name: string;
  price: string;
  quantity: number;
  image: string;
  commerceName: string;
  unitType?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  getItemsByCommerce: () => Record<number, { commerceName: string; items: CartItem[] }>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        let newItems: CartItem[];
        const qtyToAdd = item.quantity || 1;
        if (existing) {
          newItems = prev.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + qtyToAdd } : i
          );
        } else {
          newItems = [...prev, { ...item, quantity: qtyToAdd }];
        }
        localStorage.setItem("cart", JSON.stringify(newItems));
        return newItems;
      });
    },
    []
  );

  const removeItem = useCallback(
    (productId: number) => {
      setItems((prev) => {
        const newItems = prev.filter((i) => i.productId !== productId);
        localStorage.setItem("cart", JSON.stringify(newItems));
        return newItems;
      });
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: number, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }
      setItems((prev) => {
        const newItems = prev.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        );
        localStorage.setItem("cart", JSON.stringify(newItems));
        return newItems;
      });
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem("cart");
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);

  const getItemsByCommerce = useCallback(() => {
    const grouped: Record<number, { commerceName: string; items: CartItem[] }> = {};
    for (const item of items) {
      if (!grouped[item.commerceId]) {
        grouped[item.commerceId] = { commerceName: item.commerceName, items: [] };
      }
      grouped[item.commerceId].items.push(item);
    }
    return grouped;
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, getItemsByCommerce }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
