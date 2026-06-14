import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import superjson from "superjson";

export interface CustomerSession {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
}

const CustomerSessionContext = createContext<{
  customer: CustomerSession | null;
  login: (customer: CustomerSession) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
} | null>(null);

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);

  useEffect(() => {
    const serialized = superjson.serialize({});
    fetch(`/api/trpc/customer.checkAuth?input=${encodeURIComponent(JSON.stringify(serialized))}`, {
      method: "GET",
      credentials: "include",
    })
      .then(r => r.json())
      .then((data) => {
        const deserialized = superjson.deserialize<{ customer: CustomerSession | null } | undefined>(data.result?.data);
        if (deserialized?.customer) {
          setCustomer(deserialized.customer);
        }
      })
      .catch(() => {});
  }, []);

  const login = useCallback((customerData: CustomerSession) => {
    setCustomer(customerData);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/trpc/customer.logout", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    setCustomer(null);
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch("/api/trpc/customer.refresh", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      const data = await res.json();
      const deserialized = superjson.deserialize<{ customer: CustomerSession | null } | undefined>(data.result?.data);
      if (deserialized?.customer) {
        setCustomer(deserialized.customer);
        return true;
      }
    } catch {}
    return false;
  }, []);

  return (
    <CustomerSessionContext.Provider value={{ customer, login, logout, isAuthenticated: !!customer, refreshToken }}>
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession() {
  const ctx = useContext(CustomerSessionContext);
  if (!ctx) throw new Error("useCustomerSession must be used within CustomerSessionProvider");
  return ctx;
}