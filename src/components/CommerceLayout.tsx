import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard, ShoppingBag, Package, BarChart3,
  LogOut, User,
} from "lucide-react";
import { trpcMutate } from "@/hooks/useDeliveryData";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/commerce" },
  { icon: ShoppingBag, label: "Pedidos", path: "/commerce/orders" },
  { icon: Package, label: "Productos", path: "/commerce/products" },
  { icon: BarChart3, label: "Estadisticas", path: "/commerce/stats" },
  { icon: User, label: "Perfil", path: "/commerce/profile" },
];

export default function CommerceLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await trpcMutate("login.logout", {}).catch(() => {});
    localStorage.removeItem("merchant_user");
    localStorage.removeItem("qs_session");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-full z-30">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2E7D32] rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800">YA LLEGA</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-[#2E7D32] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            Salir
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        {children}
      </main>

      {/* Bottom nav - mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around py-1 z-50">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
              location.pathname === item.path
                ? "text-[#2E7D32]"
                : "text-gray-400"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
