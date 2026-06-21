import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { trpcMutate } from "./useDeliveryData";

type AuthUser = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const navigate = useNavigate();

  const login = useCallback(async (email: string, phone: string | undefined, password: string) => {
    const input: any = { password };
    if (email) input.email = email;
    if (phone) input.phone = phone;

    const res = await fetch("/api/trpc/login.login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: input }),
    });
    const data = await res.json();
    const result = data?.result?.data?.json;
    if (result?.success) {
      setUser(result.user);
      return result;
    }
    return null;
  }, []);

  const logout = useCallback(async () => {
    await trpcMutate("login.logout", {}).catch(() => {});
    setUser(null);
    navigate("/login");
  }, [navigate]);

  return useMemo(() => ({
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading: false,
    login,
    logout,
  }), [user, login, logout]);
}